package getdata

import (
	"encoding/json"
	"fmt"
	"github.com/sirupsen/logrus"
	"io"
	"net/http"
	"time"
)

type Rating struct {
	Rating int `json:"rating"`
}

type Leaderboards struct {
	RmTeam Rating `json:"rm_team"`
	RmSolo Rating `json:"rm_solo"`
}

type PlayerSearch struct {
	Name         string       `json:"name"`
	ProfileID    int          `json:"profile_id"`
	LastGameAt   string       `json:"last_game_at"`
	Leaderboards Leaderboards `json:"leaderboards"`
}

type SearchResponse struct {
	Players []PlayerSearch `json:"players"`
}

// SearchPlayers searches for players based on the query string
func SearchPlayers(query string, page int, logger *logrus.Logger) ([]PlayerSearch, error) {
	// Construct the URL
	url := fmt.Sprintf("https://aoe4world.com/api/v0/players/search?query=%s&page=%d&limit=10", query, page)

	logger.Println("Sending GET request to", url)
	// Send the GET request
	resp, err := http.Get(url)
	if err != nil {
		logger.Errorf("Failed to send GET request: %v", err)
		return nil, err
	}
	defer resp.Body.Close()

	// Read the response body
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		logger.Errorf("Failed to read response body: %v", err)
		return nil, err
	}

	// Unmarshal the JSON response
	var searchResponse SearchResponse
	err = json.Unmarshal(body, &searchResponse)
	if err != nil {
		logger.Errorf("Failed to unmarshal JSON response: %v", err)
		return nil, err
	}

	// Filter the players who have played in the last 3 months
	var recentPlayers []PlayerSearch
	threeMonthsAgo := time.Now().AddDate(0, -3, 0)
	for _, player := range searchResponse.Players {
		lastGameTime, err := time.Parse(time.RFC3339, player.LastGameAt)
		if err != nil {
			return nil, err
		}
		if lastGameTime.After(threeMonthsAgo) {
			recentPlayers = append(recentPlayers, player)
		}
	}

	// Return the recent players
	return recentPlayers, nil
}
