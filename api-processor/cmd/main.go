package main

import (
	"aoe4-when-will-i-be-conc/internal/getdata"
	"aoe4-when-will-i-be-conc/internal/log"
	"encoding/json"
	"fmt"
	"github.com/rs/cors"
	"github.com/sirupsen/logrus"
	"net/http"
	"os"
	"strconv"
)

type Handler struct {
	Logger *logrus.Logger
}

type Response struct {
	Dates      []float64 `json:"dates"`
	Ratings    []float64 `json:"ratings"`
	MinDate    float64   `json:"min_date"`
	Y1         float64   `json:"y1"`
	Y2         float64   `json:"y2"`
	X2         float64   `json:"x2"`
	Slope      float64   `json:"slope"`     // Add this line
	Intercept  float64   `json:"intercept"` // Add this line
	PlayerName string    `json:"player_name"`
	PlayerID   int       `json:"player_id"`
}

func (h *Handler) handleGetTrend(w http.ResponseWriter, r *http.Request) {

	h.Logger.Info("Received request")

	// Extract player ID and game type from URL parameters
	playerIDKeys, ok := r.URL.Query()["playerID"]
	gameTypeKeys, ok2 := r.URL.Query()["gameType"]
	predictionLimitKeys, ok2 := r.URL.Query()["predictionLimit"]

	// Check that there is a player ID and game type in the URL parameters
	if !ok || len(playerIDKeys[0]) < 1 || !ok2 || len(gameTypeKeys[0]) < 1 || !ok2 || len(predictionLimitKeys[0]) < 1 {
		fmt.Println("Url Param 'playerID' or 'gameType' is missing")
		return
	}

	h.Logger.Infof("Received request for player ID: %s, game type: %s and prediciton limit %s", playerIDKeys[0], gameTypeKeys[0], predictionLimitKeys[0])

	// Convert player ID to an integer
	playerID, err := strconv.Atoi(playerIDKeys[0])
	if err != nil {
		h.Logger.Errorf("Failed to convert player ID to integer: %v", err)
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	gameType := gameTypeKeys[0]
	h.Logger.Infof("Game type: %v", gameType)

	// Pass player ID to GetDatesAndRatings
	h.Logger.Infof("Getting data for player ID: %d", playerID)
	dates, ratings, playerName, err := getdata.GetDatesAndRatings(playerID, 7, h.Logger, gameType)
	h.Logger.Infof("Player name: %s", playerName)
	if err != nil {
		h.Logger.Errorf("Failed to get data for player ID: %d", playerID)
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	// Check if dates slice is empty
	if len(dates) == 0 {
		h.Logger.Errorf("No data available for player ID: %d", playerID)
		http.Error(w, "No data available", http.StatusNotFound)
		return
	}

	// Create a response object
	response := Response{
		Dates:      dates,
		Ratings:    ratings,
		PlayerName: playerName,
		PlayerID:   playerID,
	}

	// Set the Content-Type header to application/json
	w.Header().Set("Content-Type", "application/json")

	// Write the response object to the http.ResponseWriter as JSON
	err = json.NewEncoder(w).Encode(response)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
}

func (h *Handler) handleSearchPlayers(w http.ResponseWriter, r *http.Request) {
	// Extract query and page from URL parameters
	keys, ok := r.URL.Query()["query"]
	if !ok || len(keys[0]) < 1 {
		http.Error(w, "Url Param 'query' is missing", http.StatusBadRequest)
		return
	}
	query := keys[0]

	keys, ok = r.URL.Query()["page"]

	// Call getdata.SearchPlayers
	players, err := getdata.SearchPlayers(query, 1, h.Logger)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	// Set the Content-Type header to application/json
	w.Header().Set("Content-Type", "application/json")

	// Write the players to the http.ResponseWriter as JSON
	err = json.NewEncoder(w).Encode(players)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
}

func main() {

	appDataPath := os.Getenv("APPDATA_PATH")
	if appDataPath == "" {
		appDataPath = "." // Default to current directory if APPDATA_PATH is not set
	}

	// Create a new logger
	logger := log.Logger(fmt.Sprintf("%s/log.txt", appDataPath))

	handler := &Handler{
		Logger: logger,
	}

	mux := http.NewServeMux()
	mux.HandleFunc("/get_player_data", handler.handleGetTrend)
	mux.HandleFunc("/find_player", handler.handleSearchPlayers)

	// Setup CORS
	c := cors.New(cors.Options{
		AllowedOrigins: []string{
			"http://localhost:5000",
			"http://localhost:8080",
			"http://localhost:3000",
			"https://api.when-will-i-be-conqueror.com",
			"https://www.when-will-i-be-conqueror.com",
			"https://when-will-i-be-conqueror.com"},
		AllowCredentials: true,
	})

	// Apply the CORS middleware
	corsHandler := c.Handler(mux)

	err := http.ListenAndServe(":9999", corsHandler)
	if err != nil {
		handler.Logger.Fatalf("Failed to start server: %v", err)
	}
}
