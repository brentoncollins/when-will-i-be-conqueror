package getdata

import (
	"encoding/json"
	"fmt"
	"github.com/sirupsen/logrus"
	"io"
	"log"
	"net/http"
	"os"
	"sort"
	"strconv"
	"time"
)

type DateRating struct {
	Date   float64
	Rating float64
}

type Player struct {
	ProfileID              int    `json:"profile_id"`
	Name                   string `json:"name"`
	Result                 string `json:"result"`
	Civilization           string `json:"civilization"`
	CivilizationRandomized bool   `json:"civilization_randomized"`
	Rating                 int    `json:"rating"`
	RatingDiff             int    `json:"rating_diff"`
	MMR                    int    `json:"mmr"`
	MMRDiff                int    `json:"mmr_diff"`
	InputType              string `json:"input_type"`
}

type Team struct {
	Player Player `json:"player"`
}

type Game struct {
	StartedAt time.Time `json:"started_at"`
	Teams     [][]Team  `json:"teams"`
	Season    int       `json:"season"`
	Kind      string    `json:"kind"`
}

type Response struct {
	Page    int    `json:"page"`
	PerPage int    `json:"per_page"`
	Count   int    `json:"count"`
	Offset  int    `json:"offset"`
	Games   []Game `json:"games"`
}

// saveGameData saves the game data to a JSON file
func saveGameData(data []DateRating, playerID string) error {
	appDataPath := os.Getenv("APPDATA_PATH")
	if appDataPath == "" {
		appDataPath = "." // Use the current directory if APPDATA_PATH is not set
	}

	file, err := os.Create(fmt.Sprintf("%s/game_data_%s.json", appDataPath, playerID))
	if err != nil {
		return err
	}
	defer file.Close()

	// Encode the game data to JSON and write it to the file.
	encoder := json.NewEncoder(file)
	err = encoder.Encode(data)
	if err != nil {
		return err
	}

	return nil
}

// GetDatesAndRatings gets the dates and ratings for a player
func GetDatesAndRatings(playerID int, season int, logger *logrus.Logger, gameType string) ([]float64, []float64, string, error) {

	// Create a slice of structs to keep dates and ratings together
	var data []DateRating
	var playerName string

	specificTimestampStr := os.Getenv("SEASON_START_TIMESTAMP")
	specificTimestamp, err := strconv.ParseFloat(specificTimestampStr, 64)
	if err != nil {
		log.Fatalf("Failed to parse SEASON_START_TIMESTAMP: %v", err)
	}

	logger.Infof("Specific timestamp: %v", specificTimestamp)

	page := 1

	for {
		logger.Infof("Getting data for player ID: %d, page: %d", playerID, page)
		url := fmt.Sprintf("https://aoe4world.com/api/v0/players/%d/games?leaderboard=%s&page=%d&since=2024-03-19T00:00:00.000Z", playerID, gameType, page)

		logger.Infof("Getting data from URL: %s", url)

		resp, err := http.Get(url)
		if err != nil {
			logger.Errorf("Error getting data from URL: %s", url)
			return nil, nil, "", err
		}
		defer resp.Body.Close()

		body, err := io.ReadAll(resp.Body)
		if err != nil {
			logger.Errorf("Error reading response body")
			return nil, nil, "", err
		}

		var response Response
		err = json.Unmarshal(body, &response)
		if err != nil {
			logger.Errorf("Error unmarshalling JSON response")
			return nil, nil, "", err
		}
		logger.Infof("Response count: %d", response.Count)

		// If there are no more games, break the loop
		if len(response.Games) == 0 {
			logger.Infof("No more games found")
			break
		}

		var gameKinds map[string]bool

		if gameType == "rm_solo" {
			gameKinds = map[string]bool{
				"rm_1v1": true,
			}
		} else {
			gameKinds = map[string]bool{
				"rm_2v2": true,
				"rm_3v3": true,
				"rm_4v4": true,
			}
		}

		for _, game := range response.Games {

			// Skip games that are not of the specified kind
			if _, ok := gameKinds[game.Kind]; !ok {
				continue
			}

			for _, team := range game.Teams {
				for _, player := range team {
					if player.Player.ProfileID == playerID {
						playerName = player.Player.Name // Assign value to playerName here

						gameTimestamp := float64(game.StartedAt.Unix())
						if gameTimestamp < specificTimestamp {

							continue
						}
						data = append(data, DateRating{Date: gameTimestamp, Rating: float64(player.Player.Rating)})
					}
				}
			}
		}

		// If count is less than per_page, break the loop
		if response.Count < response.PerPage {
			logger.Infof("Count is less than per_page, breaking loop")
			break
		}

		// Go to the next page
		page++
	}

	// logger.Debugf("Data slice before saving: %v", data)

	err = saveGameData(data, playerName)
	if err != nil {
		logger.Errorf("Error saving game data")
		return nil, nil, "", err
	}

	// Sort the data slice by date
	sort.Slice(data, func(i, j int) bool {
		return data[i].Date < data[j].Date
	})

	// Extract the sorted dates and ratings into separate slices
	var dates []float64
	var ratings []float64
	for _, dr := range data {
		dates = append(dates, dr.Date)
		ratings = append(ratings, dr.Rating)
	}

	// Process the ratings to replace any 0 ratings with the previous or next non-zero rating
	dates, ratings = processRatings(dates, ratings)

	// Add the current date and the rating from the last game to the slices
	dates, ratings = addCurrentDateToSlice(dates, ratings)

	logger.Infof("Data extracted successfully for player: %s", playerName)
	return dates, ratings, playerName, nil
}

// addCurrentDateToSlice adds the current date and the rating from the last game to the slices
func addCurrentDateToSlice(dates []float64, ratings []float64) ([]float64, []float64) {
	// Get the current timestamp
	currentTimestamp := float64(time.Now().Unix())

	// Get the rating from the last game
	lastGameRating := ratings[len(ratings)-1]

	// Append the current timestamp and the rating from the last game to the slices
	dates = append(dates, currentTimestamp)
	ratings = append(ratings, lastGameRating)

	return dates, ratings
}

// processRatings skips the first 5 ratings of the season, and replaces
// any 0 ratings with the previous or next non-zero rating for all other ratings,
// I think the 0 ratings are from games that were not played due to early exit or fail to load game.
func processRatings(dates []float64, ratings []float64) ([]float64, []float64) {
	var newDates []float64
	var newRatings []float64
	zeroCount := 0

	// Skip the first 5 ratings of the season
	for i, rating := range ratings {
		if rating == 0 {
			zeroCount++
			if zeroCount > 5 {
				newDates = append(newDates, dates[i])
				newRatings = append(newRatings, rating)
			}
		} else {
			newDates = append(newDates, dates[i])
			newRatings = append(newRatings, rating)
		}
	}

	// Replace any 0 ratings with the previous or next non-zero rating
	for i := 0; i < len(newRatings); i++ {
		if newRatings[i] == 0 {
			prevRating := 0.0
			for j := i - 1; j >= 0; j-- {
				if newRatings[j] != 0 {
					prevRating = newRatings[j]
					break
				}
			}

			// If there is no previous rating, get the next rating
			nextRating := 0.0
			for j := i + 1; j < len(newRatings); j++ {
				if newRatings[j] != 0 {
					nextRating = newRatings[j]
					break
				}
			}

			// If there is no next rating, use the previous rating
			if prevRating != 0 {
				newRatings[i] = prevRating
			} else if nextRating != 0 {
				newRatings[i] = nextRating
			}
		}
	}

	return newDates, newRatings
}
