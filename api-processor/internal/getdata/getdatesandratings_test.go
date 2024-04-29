package getdata

import (
	"testing"
)

type Response1 struct {
	Dates   []float64 `json:"dates"`
	Ratings []float64 `json:"ratings"`
	MinDate float64   `json:"min_date"`
	Y1      float64   `json:"y1"`
	Y2      float64   `json:"y2"`
}

func TestGetDatesAndRatings(t *testing.T) {
	// Define test cases

}
