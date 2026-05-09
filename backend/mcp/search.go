package mcp

import "context"

type SearchResult struct {
    Title   string `json:"title"`
    URL     string `json:"url"`
    Snippet string `json:"snippet"`
}

func GoogleSearch(ctx context.Context, query string) ([]SearchResult, error) {
    // Stub
    return nil, nil
}
