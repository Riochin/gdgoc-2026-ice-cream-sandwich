package agent

import (
	"context"
	"fmt"
	"log"
	"os"
	"sync"

	"google.golang.org/genai"

	adkagent "google.golang.org/adk/agent"
	"google.golang.org/adk/agent/llmagent"
	"google.golang.org/adk/model"
	"google.golang.org/adk/model/gemini"
	"google.golang.org/adk/runner"
	"google.golang.org/adk/session"
	"google.golang.org/adk/tool"
	"google.golang.org/adk/tool/functiontool"

	"github.com/gdgoc/ice-cream-sandwich/mcp"
)

var (
	adkRunner     *runner.Runner
	adkSessionSvc session.Service
	initOnce      sync.Once
	initErr       error
)

func Init() {
	log.Println("Initializing agent...")
	initOnce.Do(func() {
		initErr = initADK(context.Background())
		if initErr != nil {
			log.Printf("ADK initialization failed (will use Gemini fallback): %v", initErr)
		} else {
			log.Println("ADK initialized successfully")
		}
	})
}

func initADK(ctx context.Context) error {
	apiKey := os.Getenv("GEMINI_API_KEY")
	if apiKey == "" {
		return fmt.Errorf("GEMINI_API_KEY is not set")
	}

	geminiModel, err := gemini.NewModel(ctx, "gemini-2.5-flash", &genai.ClientConfig{
		APIKey: apiKey,
	})
	if err != nil {
		return fmt.Errorf("failed to create Gemini model: %w", err)
	}

	searchTool, err := functiontool.New(functiontool.Config{
		Name:        "search_places",
		Description: "飲食店・場所を検索します。location: 地名や住所, keyword: ジャンルや店名, open_now: 営業中のみ, price_level: 価格帯(0=指定なし,1=安い,2=普通,3=高い,4=とても高い)",
	}, func(tCtx tool.Context, input searchPlacesInput) (searchPlacesOutput, error) {
		places, err := mcp.SearchPlaces(tCtx, input.Location, input.Keyword, input.OpenNow, input.PriceLevel)
		if err != nil {
			return searchPlacesOutput{}, err
		}
		return searchPlacesOutput{Places: places}, nil
	})
	if err != nil {
		return fmt.Errorf("failed to create search_places tool: %w", err)
	}

	routesTool, err := functiontool.New(functiontool.Config{
		Name:        "compute_routes",
		Description: "現在地や指定場所から目的地への経路・所要時間を計算します。travel_mode: WALK/DRIVE/TRANSIT/BICYCLE",
	}, func(tCtx tool.Context, input computeRoutesInput) (mcp.Route, error) {
		return mcp.ComputeRoutes(tCtx, input.Origin, input.Destination, input.TravelMode)
	})
	if err != nil {
		return fmt.Errorf("failed to create compute_routes tool: %w", err)
	}

	webSearchTool, err := functiontool.New(functiontool.Config{
		Name:        "web_search",
		Description: "店舗のメニュー・口コミ・営業時間・予約情報・公式サイトの情報など、Maps では得られない詳細情報を Web から取得します。query: 自然言語の検索質問（例: 「らーめんはやし 渋谷 おすすめメニュー」）",
	}, func(tCtx tool.Context, input webSearchInput) (webSearchOutput, error) {
		return doWebSearch(tCtx, apiKey, input.Query)
	})
	if err != nil {
		return fmt.Errorf("failed to create web_search tool: %w", err)
	}

	ag, err := llmagent.New(llmagent.Config{
		Name:        "concierge_agent",
		Model:       geminiModel,
		Instruction: SystemPrompt,
		Tools:       []tool.Tool{searchTool, routesTool, webSearchTool},
	})
	if err != nil {
		return fmt.Errorf("failed to create LLM agent: %w", err)
	}

	adkSessionSvc = session.InMemoryService()
	adkRunner, err = runner.New(runner.Config{
		AppName:        "concierge",
		Agent:          ag,
		SessionService: adkSessionSvc,
	})
	if err != nil {
		return fmt.Errorf("failed to create runner: %w", err)
	}

	return nil
}

type searchPlacesInput struct {
	Location   string `json:"location"`
	Keyword    string `json:"keyword"`
	OpenNow    bool   `json:"open_now"`
	PriceLevel int    `json:"price_level"`
}

type searchPlacesOutput struct {
	Places []mcp.Place `json:"places"`
}

type computeRoutesInput struct {
	Origin      string `json:"origin"`
	Destination string `json:"destination"`
	TravelMode  string `json:"travel_mode"`
}

type webSearchInput struct {
	Query string `json:"query"`
}

type webSearchOutput struct {
	Summary string `json:"summary"`
}

// doWebSearch wraps a separate Gemini invocation that has GoogleSearch
// grounding enabled. The main concierge agent uses function calling and
// can't enable built-in tools in the same request, so we expose this as a
// regular function tool instead.
func doWebSearch(ctx context.Context, apiKey, query string) (webSearchOutput, error) {
	if query == "" {
		return webSearchOutput{}, fmt.Errorf("empty query")
	}
	client, err := genai.NewClient(ctx, &genai.ClientConfig{APIKey: apiKey})
	if err != nil {
		return webSearchOutput{}, fmt.Errorf("web_search: failed to create client: %w", err)
	}
	config := &genai.GenerateContentConfig{
		Tools: []*genai.Tool{{GoogleSearch: &genai.GoogleSearch{}}},
	}
	chat, err := client.Chats.Create(ctx, "gemini-2.5-flash", config, nil)
	if err != nil {
		return webSearchOutput{}, fmt.Errorf("web_search: failed to create chat: %w", err)
	}
	resp, err := chat.SendMessage(ctx, genai.Part{Text: query})
	if err != nil {
		return webSearchOutput{}, fmt.Errorf("web_search: send message: %w", err)
	}
	text := resp.Text()
	if text == "" {
		text = "（該当する情報は見つかりませんでした）"
	}
	return webSearchOutput{Summary: text}, nil
}

func Run(ctx context.Context, message string, history interface{}) (string, []string, error) {
	initOnce.Do(func() {
		initErr = initADK(ctx)
		if initErr != nil {
			log.Printf("ADK initialization failed (will use Gemini fallback): %v", initErr)
		}
	})

	if initErr != nil {
		log.Printf("ADK unavailable, using Gemini fallback: %v", initErr)
		return runFallback(ctx, message, history)
	}

	reply, usedTools, err := runWithADK(ctx, message, history)
	if err != nil {
		log.Printf("ADK run failed, using Gemini fallback: %v", err)
		return runFallback(ctx, message, history)
	}
	return reply, usedTools, nil
}

func runWithADK(ctx context.Context, message string, history interface{}) (string, []string, error) {
	sessResp, err := adkSessionSvc.Create(ctx, &session.CreateRequest{
		AppName: "concierge",
		UserID:  "anonymous",
	})
	if err != nil {
		return "", nil, fmt.Errorf("failed to create session: %w", err)
	}
	sess := sessResp.Session

	if historySlice, ok := history.([]interface{}); ok {
		for _, item := range historySlice {
			m, ok := item.(map[string]interface{})
			if !ok {
				continue
			}
			role, _ := m["role"].(string)
			content, _ := m["content"].(string)
			if role == "" || content == "" {
				continue
			}

			genaiRole := genai.Role("user")
			author := "user"
			if role == "assistant" {
				genaiRole = genai.Role("model")
				author = "model"
			}

			ev := session.NewEvent("history")
			ev.Author = author
			ev.LLMResponse = model.LLMResponse{
				Content: genai.NewContentFromText(content, genaiRole),
			}
			if err := adkSessionSvc.AppendEvent(ctx, sess, ev); err != nil {
				log.Printf("failed to inject history event: %v", err)
			}
		}
	}

	userMsg := genai.NewContentFromText(message, genai.RoleUser)

	var reply string
	var usedTools []string
	toolSeen := map[string]bool{}

	for event, err := range adkRunner.Run(ctx, "anonymous", sess.ID(), userMsg, adkagent.RunConfig{}) {
		if err != nil {
			return "", nil, fmt.Errorf("ADK run error: %w", err)
		}
		if event == nil {
			continue
		}

		if event.LLMResponse.Content != nil {
			for _, part := range event.LLMResponse.Content.Parts {
				if part.FunctionCall != nil && !toolSeen[part.FunctionCall.Name] {
					usedTools = append(usedTools, part.FunctionCall.Name)
					toolSeen[part.FunctionCall.Name] = true
				}
			}
		}
		if event.LLMResponse.GroundingMetadata != nil && !toolSeen["google_search"] {
			usedTools = append(usedTools, "google_search")
			toolSeen["google_search"] = true
		}

		if event.IsFinalResponse() && event.LLMResponse.Content != nil {
			for _, part := range event.LLMResponse.Content.Parts {
				reply += part.Text
			}
		}
	}

	if reply == "" {
		reply = "申し訳ありません、回答を生成できませんでした。"
	}
	if usedTools == nil {
		usedTools = []string{}
	}

	return reply, usedTools, nil
}

func runFallback(ctx context.Context, message string, history interface{}) (string, []string, error) {
	apiKey := os.Getenv("GEMINI_API_KEY")
	if apiKey == "" {
		return "", nil, fmt.Errorf("GEMINI_API_KEY is not set")
	}

	client, err := genai.NewClient(ctx, &genai.ClientConfig{APIKey: apiKey})
	if err != nil {
		return "", nil, fmt.Errorf("failed to create client: %w", err)
	}

	config := &genai.GenerateContentConfig{
		SystemInstruction: &genai.Content{
			Parts: []*genai.Part{{Text: SystemPrompt}},
		},
		Tools: []*genai.Tool{
			{GoogleSearch: &genai.GoogleSearch{}},
		},
	}

	var chatHistory []*genai.Content
	if historySlice, ok := history.([]interface{}); ok {
		for _, hItem := range historySlice {
			if hMap, ok := hItem.(map[string]interface{}); ok {
				roleStr, _ := hMap["role"].(string)
				contentStr, _ := hMap["content"].(string)
				if roleStr == "assistant" {
					roleStr = "model"
				}
				if roleStr != "" && contentStr != "" {
					chatHistory = append(chatHistory, &genai.Content{
						Role:  roleStr,
						Parts: []*genai.Part{{Text: contentStr}},
					})
				}
			}
		}
	}

	chat, err := client.Chats.Create(ctx, "gemini-2.5-flash", config, chatHistory)
	if err != nil {
		return "", nil, fmt.Errorf("failed to create chat: %w", err)
	}

	resp, err := chat.SendMessage(ctx, genai.Part{Text: message})
	if err != nil {
		return "", nil, fmt.Errorf("failed to send message: %w", err)
	}

	reply := resp.Text()
	if reply == "" {
		reply = "申し訳ありません、回答を生成できませんでした。"
	}

	var usedTools []string
	if len(resp.Candidates) > 0 && resp.Candidates[0].GroundingMetadata != nil {
		usedTools = append(usedTools, "google_search")
	}
	if usedTools == nil {
		usedTools = []string{}
	}

	return reply, usedTools, nil
}

func RunStream(ctx context.Context, message string, history interface{}) error {
	return fmt.Errorf("not implemented")
}
