package mcp

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
)

type Place struct {
	ID      string  `json:"id"`
	Name    string  `json:"name"`
	Rating  float64 `json:"rating"`
	Address string  `json:"address"`
	Lat     float64 `json:"lat"`
	Lng     float64 `json:"lng"`
	URL     string  `json:"url"`
}

type Route struct {
	Duration string `json:"duration"`
	Distance string `json:"distance"`
	Polyline string `json:"polyline"`
}

func SearchPlaces(ctx context.Context, location, keyword string, openNow bool, priceLevel int) ([]Place, error) {
	apiKey := os.Getenv("GOOGLE_MAPS_API_KEY")
	if apiKey == "" {
		return nil, fmt.Errorf("GOOGLE_MAPS_API_KEY is not set")
	}

	query := keyword
	if location != "" {
		query = keyword + " " + location
	}

	reqBody := map[string]interface{}{
		"textQuery":      query,
		"languageCode":   "ja",
		"maxResultCount": 10,
	}
	if openNow {
		reqBody["openNow"] = true
	}
	priceLevels := []string{
		"PRICE_LEVEL_UNSPECIFIED",
		"PRICE_LEVEL_INEXPENSIVE",
		"PRICE_LEVEL_MODERATE",
		"PRICE_LEVEL_EXPENSIVE",
		"PRICE_LEVEL_VERY_EXPENSIVE",
	}
	if priceLevel > 0 && priceLevel < len(priceLevels) {
		reqBody["maxPriceLevel"] = priceLevels[priceLevel]
	}

	bodyBytes, err := json.Marshal(reqBody)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal request: %w", err)
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodPost,
		"https://places.googleapis.com/v1/places:searchText",
		bytes.NewReader(bodyBytes))
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("X-Goog-Api-Key", apiKey)
	req.Header.Set("X-Goog-FieldMask",
		"places.displayName,places.formattedAddress,places.rating,places.id,places.location,places.googleMapsUri")

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("places API request failed: %w", err)
	}
	defer resp.Body.Close()

	body, _ := io.ReadAll(resp.Body)
	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("places API error %d: %s", resp.StatusCode, body)
	}

	var result struct {
		Places []struct {
			ID          string `json:"id"`
			DisplayName struct {
				Text string `json:"text"`
			} `json:"displayName"`
			FormattedAddress string  `json:"formattedAddress"`
			Rating           float64 `json:"rating"`
			Location         struct {
				Latitude  float64 `json:"latitude"`
				Longitude float64 `json:"longitude"`
			} `json:"location"`
			GoogleMapsURI string `json:"googleMapsUri"`
		} `json:"places"`
	}
	if err := json.Unmarshal(body, &result); err != nil {
		return nil, fmt.Errorf("failed to parse places response: %w", err)
	}

	places := make([]Place, 0, len(result.Places))
	for _, p := range result.Places {
		places = append(places, Place{
			ID:      p.ID,
			Name:    p.DisplayName.Text,
			Rating:  p.Rating,
			Address: p.FormattedAddress,
			Lat:     p.Location.Latitude,
			Lng:     p.Location.Longitude,
			URL:     p.GoogleMapsURI,
		})
	}
	return places, nil
}

func ComputeRoutes(ctx context.Context, origin, destination, travelMode string) (Route, error) {
	apiKey := os.Getenv("GOOGLE_MAPS_API_KEY")
	if apiKey == "" {
		return Route{}, fmt.Errorf("GOOGLE_MAPS_API_KEY is not set")
	}

	mode := "WALK"
	switch travelMode {
	case "DRIVE", "TRANSIT", "BICYCLE":
		mode = travelMode
	}

	reqBody := map[string]interface{}{
		"origin":       map[string]interface{}{"address": origin},
		"destination":  map[string]interface{}{"address": destination},
		"travelMode":   mode,
		"languageCode": "ja",
	}

	bodyBytes, err := json.Marshal(reqBody)
	if err != nil {
		return Route{}, fmt.Errorf("failed to marshal request: %w", err)
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodPost,
		"https://routes.googleapis.com/directions/v2:computeRoutes",
		bytes.NewReader(bodyBytes))
	if err != nil {
		return Route{}, fmt.Errorf("failed to create request: %w", err)
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("X-Goog-Api-Key", apiKey)
	req.Header.Set("X-Goog-FieldMask", "routes.duration,routes.distanceMeters")

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return Route{}, fmt.Errorf("routes API request failed: %w", err)
	}
	defer resp.Body.Close()

	body, _ := io.ReadAll(resp.Body)
	if resp.StatusCode != http.StatusOK {
		return Route{}, fmt.Errorf("routes API error %d: %s", resp.StatusCode, body)
	}

	var result struct {
		Routes []struct {
			Duration       string `json:"duration"`
			DistanceMeters int    `json:"distanceMeters"`
		} `json:"routes"`
	}
	if err := json.Unmarshal(body, &result); err != nil {
		return Route{}, fmt.Errorf("failed to parse routes response: %w", err)
	}

	if len(result.Routes) == 0 {
		return Route{}, fmt.Errorf("no routes found")
	}

	r := result.Routes[0]

	// Convert "XXXs" duration to human-readable minutes
	duration := r.Duration
	var seconds int
	fmt.Sscanf(r.Duration, "%ds", &seconds)
	if seconds > 0 {
		minutes := seconds / 60
		if minutes > 0 {
			duration = fmt.Sprintf("%d分", minutes)
		}
	}

	return Route{
		Duration: duration,
		Distance: fmt.Sprintf("%dm", r.DistanceMeters),
	}, nil
}
