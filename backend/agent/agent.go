package agent

import (
	"context"
	"fmt"
	"log"
	"os"

	"google.golang.org/genai"
)

func Init() {
	log.Println("Initializing Gemini Agent...")
}

func Run(ctx context.Context, message string, history interface{}) (string, []string, error) {
	apiKey := os.Getenv("GEMINI_API_KEY")
	if apiKey == "" {
		return "", nil, fmt.Errorf("GEMINI_API_KEY is not set")
	}

	client, err := genai.NewClient(ctx, &genai.ClientConfig{APIKey: apiKey})
	if err != nil {
		log.Printf("Failed to create GenAI client: %v", err)
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
		log.Printf("Failed to send message: %v", err)
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
