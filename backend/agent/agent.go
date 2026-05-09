package agent

import (
    "context"
    "fmt"
    "log"
    "os"

    "github.com/google/generative-ai-go/genai"
    "google.golang.org/api/option"
)

func Init() {
    log.Println("Initializing Gemini Agent...")
}

func Run(ctx context.Context, message string, history interface{}) (string, []string, error) {
    apiKey := os.Getenv("GEMINI_API_KEY")
    if apiKey == "" {
        return "", nil, fmt.Errorf("GEMINI_API_KEY is not set")
    }

    client, err := genai.NewClient(ctx, option.WithAPIKey(apiKey))
    if err != nil {
        log.Printf("Failed to create GenAI client: %v", err)
        return "", nil, fmt.Errorf("failed to create client: %w", err)
    }
    defer client.Close()

    model := client.GenerativeModel("gemini-2.5-flash")
    model.SystemInstruction = &genai.Content{
        Parts: []genai.Part{genai.Text(SystemPrompt)},
    }

    // Enable Google Search Grounding tool
    model.Tools = []*genai.Tool{
        {
            GoogleSearch: &genai.GoogleSearch{},
        },
    }

    session := model.StartChat()
    
    // Parse history
    if historySlice, ok := history.([]interface{}); ok {
        for _, hItem := range historySlice {
            if hMap, ok := hItem.(map[string]interface{}); ok {
                roleStr, _ := hMap["role"].(string)
                contentStr, _ := hMap["content"].(string)

                role := roleStr
                if role == "assistant" {
                    role = "model"
                }

                if role != "" && contentStr != "" {
                    session.History = append(session.History, &genai.Content{
                        Role:  role,
                        Parts: []genai.Part{genai.Text(contentStr)},
                    })
                }
            }
        }
    }

    resp, err := session.SendMessage(ctx, genai.Text(message))
    if err != nil {
        log.Printf("Failed to send message: %v", err)
        return "", nil, fmt.Errorf("failed to send message: %w", err)
    }

    var reply string
    var usedTools []string

    if len(resp.Candidates) > 0 {
        candidate := resp.Candidates[0]
        if len(candidate.Content.Parts) > 0 {
            if textPart, ok := candidate.Content.Parts[0].(genai.Text); ok {
                reply = string(textPart)
            } else {
                reply = fmt.Sprintf("%v", candidate.Content.Parts[0])
            }
        }

        // Add used tools heuristic for Google Search Grounding
        if candidate.GroundingMetadata != nil {
            usedTools = append(usedTools, "google_search")
        }
    } else {
        reply = "申し訳ありません、回答を生成できませんでした。"
    }

    if usedTools == nil {
        usedTools = []string{}
    }

    return reply, usedTools, nil
}

func RunStream(ctx context.Context, message string, history interface{}) error {
    return fmt.Errorf("not implemented")
}
