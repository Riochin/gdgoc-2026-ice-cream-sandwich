package mcp

import "context"

type Place struct {
    ID      string `json:"id"`
    Name    string `json:"name"`
    Rating  float64 `json:"rating"`
    Address string `json:"address"`
    Lat     float64 `json:"lat"`
    Lng     float64 `json:"lng"`
    URL     string `json:"url"`
}

type Route struct {
    Duration string `json:"duration"`
    Distance string `json:"distance"`
    Polyline string `json:"polyline"`
}

func SearchPlaces(ctx context.Context, location, keyword string, openNow bool, priceLevel int) ([]Place, error) {
    // Stub
    return nil, nil
}

func ComputeRoutes(ctx context.Context, origin, destination, travelMode string) (Route, error) {
    // Stub
    return Route{}, nil
}
