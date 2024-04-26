import React, {useCallback, useEffect, useRef, useState} from 'react';
import Select from 'react-select';
import makeAnimated from 'react-select/animated';
import AsyncSelect from 'react-select/async';
import {ranks, ranksToOptions} from "./ranks";
import './App.css';
import * as d3 from "d3";
import {getRegressionLine} from "./linearRegression";


const animatedComponents = makeAnimated();

if (process.env.NODE_ENV === 'production') {
    console.log = () => {
    };
}


function App(callback, deps) {
    const [selectedPlayer, setSelectedPlayerState] = useState({value: '', label: ''});
    const [inputValue, setInputValue] = useState('');
    const [playerData, setPlayerData] = useState({playerData: []});
    const [regressionDataSet, setRegressionData] = useState(null);
    const [cachedOptions, setCachedOptions] = useState({});
    const [isLoading, setIsLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState(null);
    const svgRef = useRef();
    const [gameType, setGameType] = useState({value: 'rm_team', label: 'Team Ranked'});
    const [predictionLimit, setPredictionLimit] = useState({value: 1600, label: 'Conqueror III'});
    const apiUrl = process.env.NODE_ENV === 'production' ? process.env.REACT_APP_PROD_API_URL : process.env.REACT_APP_DEV_API_URL;
    const [rankPredictOptions, setRankPredictOptions] = useState(ranksToOptions(ranks));


    const updateVisualization = useCallback(() => {

        const dimensions = getViewportDimensions();
        let width, height, data, x1, y1, x2, y2, slope, intercept, playerName;
        width = dimensions.width;
        height = dimensions.height;
        data = playerData.playerData;
        x1 = regressionDataSet.x1;
        y1 = regressionDataSet.y1;
        x2 = regressionDataSet.x2;
        y2 = regressionDataSet.y2;
        slope = regressionDataSet.slope;
        intercept = regressionDataSet.intercept;
        playerName = playerData.playerName;
        const margin = dimensions.padding;

        console.log('updateVisualization data:', data);


        const svg = d3.select(svgRef.current);

        svg.selectAll("*").remove();


        // Adjust the width by subtracting the left and right margins
        const adjustedWidth = width - margin.left - margin.right;

        const xScale = d3.scaleTime()
            .domain([x1, x2]) // Use x2 as the upper limit
            .range([margin.left, adjustedWidth]); // Use the adjusted width here

        // Calculate the minimum and maximum y values
        // Calculate the minimum and maximum y values
        // Calculate the minimum y value
        const minY = Math.min(y1, y2, ...data.map(d => d.rating)) - 50;
        const maxY = Math.max(predictionLimit.value, Math.max(...data.map(d => d.rating)));

        // Set scales
        const yScale = d3.scaleLinear()
            .domain([minY, maxY]) // Set the domain to [minY, maxY]
            .range([height - margin.bottom, margin.top]);

        // Line generator for the player data
        const line = d3.line()
            .defined(d => !isNaN(d.date) && !isNaN(d.rating)) // Ignore data points with non-numeric date or rating
            .x(d => xScale(d.date))
            .y(d => yScale(d.rating));

        // Create x-axis
        const xAxis = d3.axisBottom(xScale)
            .ticks(5) // Adjust for desired number of ticks
            .tickFormat(d3.timeFormat("%Y-%m-%d")); // Format date

        // Append x-axis to SVG
        svg.append("g")
            .attr("transform", `translate(0,${height - margin.bottom})`) // Adjust y-position of x-axis
            .call(xAxis)
            .selectAll("text")
            .attr("transform", "rotate(-65)") // Rotate labels for readability
            .style("text-anchor", "end");

        // Create y-axis
        const yAxis = d3.axisLeft(yScale)
            .ticks(5); // Adjust for desired number of ticks


        // Append the player's name to the SVG
        svg.append('text')
            .attr('x', width / 2) // Center horizontally
            .attr('y', height / 8) // Small margin from the top
            .text(playerName)
            .attr('font-size', '20px')
            .attr('fill', 'white')
            .attr('text-anchor', 'middle');

        // Append the additional text to the SVG on a new line
        if (slope < 0) {
            svg.append('text')
                .attr('x', width / 2) // Center horizontally
                .attr('y', height / 8 + 20) // Position below the previous text
                .text('Sorry, can\'t do much with a negative slope.')
                .attr('font-size', '20px')
                .attr('fill', 'white')
                .attr('text-anchor', 'middle');
        }
        // Append y-axis to SVG
        svg.append("g")
            .attr("transform", `translate(${margin.left},0)`)
            .call(yAxis);

        // Append the path for line
        svg.append('path')
            .datum(data)
            .attr('fill', 'none')
            .attr('stroke', 'steelblue')
            .attr('stroke-width', 1.5)
            .attr('d', line);

        // Draw the regression line from x1 to x2
        svg.append("line")
            .attr("x1", xScale(x1))
            .attr("y1", yScale(y1))
            .attr("x2", xScale(x2))
            .attr("y2", yScale(y2))
            .attr("stroke", "red")
            .attr("stroke-width", 2)
            .style("stroke-dasharray", ("3, 3"));

        // Append small dots for each data point
        svg.selectAll(".dot")
            .data(data)
            .enter().append("circle") // Uses the enter().append() method
            .attr("class", "dot") // Assign a class for styling
            .attr("cx", function (d) {
                return xScale(d.date)
            })
            .attr("cy", function (d) {
                return yScale(d.rating)
            })
            .attr("r", 1) // Radius size, you can adjust as needed
            .attr("fill", "white"); // Fill color, you can adjust as needed


        ranks.forEach(rank => {

            if ((rank.max_width < width) || (rank.points === predictionLimit.value)) {

                const x = new Date(((rank.points - intercept) / slope));

                if (x >= x1 && x <= x2) {
                    // Append SVG image instead of circle
                    svg.append('image')
                        .attr('xlink:href', rank.filename)
                        .attr('x', xScale(x)) // Center the image at the point; adjust as needed
                        .attr('y', yScale(rank.points))
                        .attr('width', 40)
                        .attr('height', 40);

                    // Append label
                    svg.append('text')
                        .attr('x', xScale(x))
                        .attr('y', yScale(rank.points) - 25) // Adjust position above the image
                        .text(rank.name)
                        .attr('font-size', '10px')
                        .attr('font-weight', 'bold')
                        .attr('fill', 'white')
                        .attr('text-anchor', 'middle');

                    svg.append('text')
                        .attr('x', xScale(x))
                        .attr('y', yScale(rank.points) + 60) // Adjust position below the image
                        .text(d3.timeFormat("%Y-%m-%d")(x)) // Format date
                        .attr('font-size', '12px')
                        .attr('font-weight', 'bold')
                        .attr('fill', 'white')
                        .attr('text-anchor', 'middle')
                        .attr('transform', `rotate(-90, ${xScale(x)}, ${yScale(rank.points) + 60})`);
                }
            }
        });

    }, [playerData, regressionDataSet, selectedPlayer, predictionLimit]); // Add any dependencies here

    const fetchPlayerDataOnly = async () => {
        try {

            const response = await fetch(`${apiUrl}/get_player_data?playerID=${selectedPlayer.value}&gameType=${gameType.value}&predictionLimit=${predictionLimit.value}`);
            const responseData = await response.text();

            // Check if the response is valid JSON
            let playerData;
            try {
                playerData = JSON.parse(responseData);
            } catch (error) {
                throw new Error('fetchPlayerDataOnly Invalid JSON: ' + responseData);
            }

            const dates = playerData.dates.map(date => new Date(date * 1000));
            const ratings = playerData.ratings;

            return {
                playerData: dates.map((date, i) => ({date, rating: ratings[i]})),
                playerName: playerData.player_name,
                playerId: playerData.player_id
            };
        } catch (error) {
            console.error("fetchPlayerDataOnly Failed to fetch data:", error)
            return {playerData: []};
        }
    };

    // Options for the game type dropdown
    const gameTypeOptions = [
        {value: 'rm_solo', label: 'Solo Ranked'},
        {value: 'rm_team', label: 'Team Ranked'}
    ];

    // Function to get the viewport dimensions, so we can adjust the SVG size
    const getViewportDimensions = useCallback(() => {
        const width = window.innerWidth;
        let height = window.innerHeight;
        let padding;

        // If not on mobile, subtract the banner height and set padding as a percentage
        if (window.innerWidth > 768) {
            const bannerHeight = getBannerHeight();
            padding = {top: 50, right: width / 5, bottom: 150, left: 50};
            height = height - bannerHeight - padding.top - padding.bottom;
        } else {
            // On mobile, set a specific height and fixed padding
            height = 500; // Adjust this value as needed
            padding = {top: 50, right: 0, bottom: 10, left: 50};
            height = height - padding.top - padding.bottom;
        }

        return {width, height, padding};
    }, []);

    // Function to get the banner height, so we can adjust the SVG size
    function getBannerHeight() {
        const infoText = document.querySelector('.info-text');
        const dropdownButtonContainer = document.querySelector('.dropdown-button-container');
        const instructionText = document.querySelector('.instruction-text');
        // Use offsetHeight instead of innerHeight
        return infoText.offsetHeight + dropdownButtonContainer.offsetHeight + instructionText.offsetHeight;
    }

    // Function to load player dropdown select values
    const loadPlayerDropdownSelectValues = useCallback(async (inputValue) => {
        // Check if the cached options contain the input value
        if (cachedOptions[inputValue]) {
            return cachedOptions[inputValue];  // Return cached data if available
        }

        setIsLoading(true);
        try {
            // Search for players with the input value
            const response = await fetch(`${apiUrl}/find_player?query=${inputValue}`);
            const data = await response.json();
            if (data) {
                // Map the player data to the required format
                const playerOptions = data.map(player => ({
                    value: player.profile_id,
                    label: `${player.name}: ${player.profile_id}`,
                    ratingTeam: player.leaderboards?.rm_team?.rating,
                    ratingSolo: player.leaderboards?.rm_solo?.rating
                }));

                setCachedOptions(prev => ({...prev, [inputValue]: playerOptions}));  // Cache the fetched results
                setIsLoading(false);
                return playerOptions;
            }
        } catch (error) {
            console.error('Error fetching player options:', error);
            setIsLoading(false);
            setErrorMessage("No Data Available, Search Again");
            return [];
        }
    }, [apiUrl, cachedOptions]);

    // Handler for input change that updates local state
    const handleSearchTextInput = useCallback((inputValue) => {

        // If the input value is empty, return
        if (!inputValue) return;
        setIsLoading(true);
        loadPlayerDropdownSelectValues(inputValue).then(playerData => {
            setIsLoading(false);
        });
    }, [loadPlayerDropdownSelectValues]);

    // Handler for input change that updates local state
    const handleInputChange = (newValue) => {
        setInputValue(newValue);
    };

    // Function to clear the SVG content
    const clearSvgContent = () => {
        d3.select(svgRef.current).selectAll("*").remove();
    };

    // Function to handle player dropdown select
    const handlePlayerDropdownSelect = async (player) => {
        if (!player || !player.value) {
            console.error('handlePlayerDropdownSelect Error: Invalid player object');
            return;
        }

        try {
            // Clear the player data
            setPlayerData({playerData: []});
            clearSvgContent();

            // Set the selected player
            setSelectedPlayerState(player);

            // Set the rank options
            if (player.value && predictionLimit) {

                await handlePlayerData(player.value, gameType.value);
            }
            // Clear the error message
            clearSvgContent();
            setErrorMessage(null);
        } catch (error) {
            console.error('handlePlayerDropdownSelect Error:', error);
            setErrorMessage("No Data Available, Search Again");
            // Clear the player data
            clearSvgContent();
            setPlayerData({playerData: []});
        }
    }

    // Function to handle game type dropdown select
    const handleGameTypeDropdownSelect = (gameType) => {

        setGameType(gameType)
    }

    // Function to handle prediction limit dropdown select
    const handlePredictionLimitDropdownSelect = async (rank) => {

        setPredictionLimit(rank);

        // Check if the player data is valid
        if (playerData && playerData.playerData && playerData.playerData.length > 0) {
            const dates = playerData.playerData.map(item => item.date);
            const ratings = playerData.playerData.map(item => item.rating);

            // Calculate the regression data
            const regressionData = calculateRegressionData(dates, ratings, rank.value);
            if (regressionData) {
                // Set the regression data
                setRegressionData(regressionData);
                // Set the player data
                setPlayerData(playerData);
            }
        } else {
            setErrorMessage("No Data Available, Search Again");
            setPlayerData({playerData: []});
        }
    }

    const handleGetDataButton = async () => {
        try {
            // Clear the SVG content
            clearSvgContent();
            setErrorMessage(null);
            setIsLoading(true);

            // Check if the selected player and game type are valid
            if (selectedPlayer && gameType && predictionLimit) {
                await handlePlayerData(selectedPlayer.value, gameType.value);
            }

            setIsLoading(false);
        } catch (error) {
            console.error('handleGetDataButton Error:', error);
            setErrorMessage("No Data Available, Search Again");
            // Clear the player data
        }
    };

    // Function to fetch player data
    const handlePlayerData = async () => {

        setErrorMessage(null);
        const playerData = await fetchPlayerDataOnly(selectedPlayer.value, gameType.value, predictionLimit.value);


        // Check if the player data is valid
        if (playerData && playerData.playerData && playerData.playerData.length > 0) {
            // Get the dates and ratings
            const dates = playerData.playerData.map(item => item.date);
            const ratings = playerData.playerData.map(item => item.rating);
            const regressionData = calculateRegressionData(dates, ratings, 1600);
            if (regressionData) {
                // Set the regression data
                setRegressionData(regressionData);
                setPlayerData(playerData);

                setRankOptions(regressionData);
            }
        } else {
            setErrorMessage("No Data Available, Search Again");
            console.error('handlePlayerData No player data available:', playerData);
            setPlayerData({playerData: []});
        }
    };

    // Function to calculate the regression data
    const calculateRegressionData = (dates, ratings, predictionLimit) => {
        // Check that dates and ratings are arrays of the same length
        if (Array.isArray(dates) && Array.isArray(ratings) && dates.length === ratings.length) {

            // Check that predictionLimit is a number
            if (typeof predictionLimit === 'number') {
                return calculateRegressionLine(dates, ratings, predictionLimit);
            } else {
                console.error('calculateRegressionData Prediction limit is not a number:', predictionLimit);
            }
        } else {
            console.error('calculateRegressionData Dates and ratings are not arrays of the same length:', dates, ratings);
        }
        return null;
    };

    // Function to calculate the regression line
    const calculateRegressionLine = (dates, ratings, predictionLimit) => {

        if (!dates || !ratings) {
            console.error('calculateRegressionData Dates or ratings are undefined');
            return;
        }

        const {slope, intercept, x1, y1, x2, y2} = getRegressionLine(dates, ratings, predictionLimit);

        return {
            x1: new Date(x1),
            x2: new Date(x2),
            y1,
            y2,
            slope,
            intercept
        };
    };



    // Function to set the rank options
    const setRankOptions = (regData) => {

        if (selectedPlayer.value !== '') {
            const rating = gameType.value === 'rm_solo' ? selectedPlayer.ratingSolo : selectedPlayer.ratingTeam;
            const gameMode = gameType.value === 'rm_solo' ? "solo" : "team";

            handleRankOptions(regData, rating, gameMode);
        }
    }

    // Function to set the rank options based on the rating
    const handleRankOptions = (regData, rating, gameMode) => {

        if (regData.slope > 0) {

            if (rating > 1600) {
                setErrorMessage(`Sorry, we cant plot for you, your ${gameMode} rating is above Conqueror III.`);
                return;
            }
            if (rating > 1500) {
                setRankPredictOptions(ranksToOptions(ranks.filter(rank => rank.points > 1500)));
                setPredictionLimit(rankPredictOptions[rankPredictOptions.length - 1]);
                return;
            }
            const currentRankIndex = ranks.findIndex(rank => rank.points > rating);
            const nextRank = ranks[currentRankIndex]; // Get the next rank
            setRankPredictOptions(ranksToOptions(ranks.filter(rank => rank.points > nextRank.points)));
            setPredictionLimit(rankPredictOptions[rankPredictOptions.length - 1]);
        }
        if (regData.slope < 0) {
            // Set to bronze, all the way down when slope is negative
            const bronzeIRank = ranks.find(rank => rank.name === "Bronze I");
            const bronzeIRankOption = ranksToOptions([bronzeIRank]);
            setRankPredictOptions(bronzeIRankOption);
            setPredictionLimit({value: bronzeIRank.points, label: bronzeIRank.name});

        }
    }

    // Use effect to update the visualization when the dimensions change
    useEffect(() => {

        // Redraw the SVG with the new dimensions
        if (playerData.playerId === selectedPlayer.value && regressionDataSet && playerData.playerData.length > 0) {

            updateVisualization();
        }

    }, [
        regressionDataSet, playerData, selectedPlayer, updateVisualization
    ]);

    const updateDimensions = useCallback(() => {
        // Here you can handle the window resize event
        // For example, you can update the state that stores the window dimensions

        // After handling the resize event, call the updateVisualization function
        if (playerData.playerId === selectedPlayer.value && regressionDataSet && playerData.playerData.length > 0) {
            updateVisualization();
        }
    }, [updateVisualization, playerData, selectedPlayer, regressionDataSet]); // Pass updateVisualization as a dependency


    useEffect(() => {
        window.addEventListener('resize', updateDimensions);

        // Cleanup function to remove the event listener when the component unmounts
        return () => window.removeEventListener('resize', updateDimensions);
    }, [updateDimensions]); // Pass updateDimensions as a dependency


    useEffect(() => {
        const timerId = setTimeout(() => {
            handleSearchTextInput(inputValue);
        }, 1000);
        return () => clearTimeout(timerId);
    }, [inputValue, handleSearchTextInput]);


    return (
        <div className="app">
            <div id="search-section" className="search-section">
                <h2 className="info-text">Enter your player name to discover through linear regression analysis when you
                    might reach the rank of Conqueror III</h2>
                <div className="instruction-text">
                    <ol>
                        <li>Search for and select your player name.</li>
                        <li>Select either "Solo Ranked" or "Team Ranked" as your game type.</li>
                        <li>Click the "Get Data" button to load your player statistics.</li>
                        <li>Change the predicted rank to update the visualization on the plot.</li>
                    </ol>
                </div>

                <div className="dropdown-button-container">
                    <AsyncSelect
                        cacheOptions
                        components={animatedComponents}
                        loadOptions={loadPlayerDropdownSelectValues}
                        onInputChange={handleInputChange}
                        onChange={handlePlayerDropdownSelect}
                        placeholder="Search for a player"
                        isMulti={false}  // set to true if multi-select is desired
                        getOptionLabel={(option) => option.label}
                        getOptionValue={(option) => option.value}
                        styles={{
                            control: (provided) => ({
                                ...provided,
                                width: '300px',
                                textAlign: 'left',
                            }),
                            menu: (provided) => ({
                                ...provided,
                                color: 'white',
                                width: '300px',
                            }),
                            option: (provided, state) => ({
                                ...provided,
                                color: state.isFocused ? 'white' : '#bbb',
                                backgroundColor: state.isFocused ? '#555' : '#333',
                            }),
                            singleValue: (provided) => ({
                                ...provided,
                                color: 'black',
                            }),
                            placeholder: (provided) => ({
                                ...provided,
                                color: 'black',
                            }),
                        }}
                    />
                    <Select
                        defaultValue={gameTypeOptions[1]}
                        options={gameTypeOptions}
                        onChange={handleGameTypeDropdownSelect}
                        // When we choose the player, we will look at the rank type and filter the possible prediction constraints.
                        className={'rank-select'}
                        styles={{
                            control: (provided) => ({
                                ...provided,
                                width: '200px', // Adjust the width as needed
                                textAlign: 'left', // Add this line
                            }),
                            menu: (provided) => ({
                                ...provided,
                                color: 'white',
                                width: '200px', // Adjust the width as needed
                            }),
                            option: (provided, state) => ({
                                ...provided,
                                color: state.isFocused ? 'white' : '#bbb',
                                backgroundColor: state.isFocused ? '#555' : '#333',
                            }),
                            singleValue: (provided) => ({
                                ...provided,
                                color: 'black',
                            }),
                            placeholder: (provided) => ({
                                ...provided,
                                color: '#bbb',
                            }),
                        }}
                    />
                    <Select
                        value={predictionLimit}
                        options={rankPredictOptions}
                        onChange={handlePredictionLimitDropdownSelect}
                        className={'rank-predict-select'}
                        styles={{
                            control: (provided) => ({
                                ...provided,
                                width: '200px',
                                textAlign: 'left',
                            }),
                            menu: (provided) => ({
                                ...provided,
                                color: 'white',
                                width: '200px',
                            }),
                            option: (provided, state) => ({
                                ...provided,
                                color: state.isFocused ? 'white' : '#bbb',
                                backgroundColor: state.isFocused ? '#555' : '#333',
                            }),
                            singleValue: (provided) => ({
                                ...provided,
                                color: 'black',
                            }),
                            placeholder: (provided) => ({
                                ...provided,
                                color: '#bbb',
                            }),
                        }}
                    />
                    <button
                        onClick={handleGetDataButton}
                        disabled={!selectedPlayer || isLoading}
                        className={`${!selectedPlayer || isLoading ? 'button-disabled' : ''} get-data-button`}>
                        Get Data
                    </button>

                    {errorMessage ? <div className="centered-message">{errorMessage}</div> : isLoading ?
                        <div className="centered-message">Loading...</div> : <div className="na"></div>}

                </div>
            </div>
            <div className="plot-section">
                <div className="plot">
                    <svg ref={svgRef}></svg>
                </div>
            </div>
        </div>
    );
}

export default App;