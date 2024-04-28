import React, { useCallback, useEffect, useRef, useState } from 'react';
import Select, { components } from 'react-select';
import makeAnimated from 'react-select/animated';
import AsyncSelect from 'react-select/async';
import { ranks, ranksToOptions } from "./ranks";
import debounce from 'lodash.debounce';
import './App.css';
import * as d3 from "d3";
import { getRegressionLine } from "./linearRegression";
import Logger from './logger';


// You can set the Logger level depending on the environment
Logger.logLevel = process.env.NODE_ENV === 'development' ? 'debug' : 'error';




const animatedComponents = makeAnimated();

function App(callback, deps) {
    const [selectedPlayer, setSelectedPlayerState] = useState({value: '', label: ''});
    const [inputValue, setInputValue] = useState('');
    const [playerData, setPlayerData] = useState({playerData: []});
    const [regressionDataSet, setRegressionData] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState(null);
    const svgRef = useRef();
    const [gameType, setGameType] = useState({value: 'rm_team', label: 'Team Ranked'});
    const [predictionLimit, setPredictionLimit] = useState({value: 1600, label: 'Conqueror III'});
    const apiUrl = process.env.NODE_ENV === 'production' ? process.env.REACT_APP_PROD_API_URL : process.env.REACT_APP_DEV_API_URL;
    const [rankPredictOptions, setRankPredictOptions] = useState(ranksToOptions(ranks));


    // Options for the game type dropdown
    const gameTypeOptions = [
        {value: 'rm_solo', label: 'Solo Ranked'},
        {value: 'rm_team', label: 'Team Ranked'}
    ];



    // Function to update the visualization
    const updateVisualization = useCallback(() => {

        Logger.debug('updateVisualization', "Called updateVisualization")

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

        Logger.debug('updateVisualization', data)
        Logger.debug('updateVisualization', regressionDataSet)
        Logger.debug('updateVisualization', playerData)
        Logger.debug('updateVisualization', dimensions)


        // Clear the SVG content
        const svg = d3.select(svgRef.current);
        svg.selectAll("*").remove();


        // Adjust the width by subtracting the left and right margins
        const adjustedWidth = width - margin.left - margin.right;

        // Set the SVG width and height
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

    const CustomInput = props => {
        return (
            <components.Input
                {...props}
                isDisabled
            />
        );
    };

    const getAsyncOptions = async (inputText) => {
        let url = `${apiUrl}/find_player?query=${inputText}`
        Logger.debug('loadPlayerDropdownSelectValues', url)

        try {
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            setIsLoading(false);

            return data.map(player => ({
                value: player.profile_id,
                label: `${player.name}: ${player.profile_id}`,
                ratingTeam: player.leaderboards?.rm_team?.rating,
                ratingSolo: player.leaderboards?.rm_solo?.rating
            }));
        } catch (error) {
            Logger.error('loadPlayerDropdownSelectValues', 'An error occurred:', error);
            setIsLoading(false);
            // You can decide what to return in case of an error
            return [];
        }
    };

    const loadOptions = useCallback(
        debounce((inputText, callback) => {
            getAsyncOptions(inputText).then((options) => callback(options));
        }, 600),
        []
    );



    // Function to fetch player data
    const fetchPlayerDataOnly = async () => {
        try {
            Logger.debug('fetchPlayerDataOnly', "Called fetchPlayerDataOnly")
            let url = `${apiUrl}/get_player_data?playerID=${selectedPlayer.value}&gameType=${gameType.value}&predictionLimit=${predictionLimit.value}`;
            Logger.debug('fetchPlayerDataOnly', url)

            const response = await fetch(url);
            const responseData = await response.text();

            Logger.debug('fetchPlayerDataOnly', responseData)

            // Check if the response is valid JSON
            let playerData;
            try {
                playerData = JSON.parse(responseData);
            } catch (error) {
                throw new Error('fetchPlayerDataOnly Invalid JSON: ' + responseData);
            }

            Logger.debug('fetchPlayerDataOnly', playerData)

            const dates = playerData.dates.map(date => new Date(date * 1000));
            const ratings = playerData.ratings;

            Logger.debug('fetchPlayerDataOnly', dates)
            Logger.debug('fetchPlayerDataOnly', ratings)

            return {
                playerData: dates.map((date, i) => ({date, rating: ratings[i]})),
                playerName: playerData.player_name,
                playerId: playerData.player_id
            };
        } catch (error) {
            Logger.error("fetchPlayerDataOnly", "Failed to fetch data:", error)
            return {playerData: []};
        }
    };

    // Function to get the viewport dimensions, so we can adjust the SVG size
    const getViewportDimensions = useCallback(() => {

        Logger.debug('getViewportDimensions', "Called getViewportDimensions")

        const width = window.innerWidth;
        let height = window.innerHeight;
        let padding;

        Logger.debug('getViewportDimensions', width)
        Logger.debug('getViewportDimensions', height)

        // If not on mobile, subtract the banner height and set padding as a percentage
        if (window.innerWidth > 768) {
            Logger.debug('getViewportDimensions', "Not on mobile")
            const bannerHeight = getBannerHeight();
            padding = {top: 50, right: width / 4, bottom: 100, left: 40};
            height = height - bannerHeight - padding.top - padding.bottom;
        } else {
            // On mobile, set a specific height and fixed padding
            Logger.debug('getViewportDimensions', "On mobile")
            height = 500; // Adjust this value as needed
            padding = {top: 50, right: 0, bottom: 10, left: 50};
            height = height - padding.top - padding.bottom;
        }

        return {width, height, padding};
    }, []);



    // Function to get the banner height, so we can adjust the SVG size
    function getBannerHeight() {
        Logger.debug('getBannerHeight', "Called getBannerHeight")
        const infoText = document.querySelector('.info-text');
        const dropdownButtonContainer = document.querySelector('.dropdown-button-container');
        const instructionText = document.querySelector('.instruction-text');
        // Use offsetHeight instead of innerHeight
        Logger.debug('getBannerHeight', infoText.offsetHeight)
        Logger.debug('getBannerHeight', dropdownButtonContainer.offsetHeight)
        Logger.debug('getBannerHeight', instructionText.offsetHeight)

        return infoText.offsetHeight + dropdownButtonContainer.offsetHeight + instructionText.offsetHeight;
    }


    // This function will update the input value state whenever the input changes
    const handleInputChange = (newValue) => {
        setInputValue(newValue);
        return newValue;
    };

    // Function to clear the SVG content
    const clearSvgContent = () => {
        Logger.debug('clearSvgContent', "Called clearSvgContent")
        d3.select(svgRef.current).selectAll("*").remove();
    };

    // Function to handle player dropdown select
    const handlePlayerDropdownSelect = async (player) => {
        Logger.debug('handlePlayerDropdownSelect', "Called handlePlayerDropdownSelect")
        if (!player || !player.value) {
            Logger.error('handlePlayerDropdownSelect', 'Invalid player:', player)
            return;
        }

        try {
            // Clear the player data
            setPlayerData({playerData: []});
            clearSvgContent();


            // Set the selected player
            setSelectedPlayerState(player);

            // Set the default rank options until we get the data to restrict them.
            Logger.debug('handlePlayerDropdownSelect', ranksToOptions(ranks))

            setRankPredictOptions(ranksToOptions(ranks.filter(rank => rank.points > 1500)));
            setPredictionLimit(rankPredictOptions[rankPredictOptions.length - 1]);

            // // Set the rank options
            // if (player.value && predictionLimit) {
            //     Logger.debug('handlePlayerDropdownSelect', player.value)
            //     Logger.debug('handlePlayerDropdownSelect', gameType.value)
            //     await handlePlayerData(player.value, gameType.value);
            // }
            // Clear the error message
            clearSvgContent();
            setErrorMessage(null);
        } catch (error) {
            Logger.error('handlePlayerDropdownSelect', 'Error:', error);
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

    // Function to fetch player data
    const handlePlayerData = async () => {
        Logger.debug('handlePlayerData', "Called handlePlayerData");
        setErrorMessage(null);

        // Fetching data based on current selected player and game configuration
        const playerData = await fetchPlayerDataOnly(selectedPlayer.value, gameType.value, predictionLimit.value);
        Logger.debug('handlePlayerData', "Fetched player data:", playerData);

        // Check if the player data is valid and has necessary details
        if (playerData && playerData.playerData && playerData.playerData.length > 0) {
            const dates = playerData.playerData.map(item => item.date);
            const ratings = playerData.playerData.map(item => item.rating);

            // Calculate regression data based on dates and ratings
            const regressionData = calculateRegressionData(dates, ratings, 1600);
            Logger.debug('handlePlayerData', "Regression data calculated:", regressionData);

            if (regressionData) {
                setRegressionData(regressionData);
                setPlayerData(playerData);
                setRankOptions(regressionData);
            }
        } else {
            setErrorMessage("No Data Available, Search Again");
            Logger.error('handlePlayerData', "No player data available:", playerData);
            setPlayerData({playerData: []});
        }
    };

// Function to handle prediction limit dropdown select
    const handlePredictionLimitDropdownSelect = async (rank) => {
        Logger.debug('handlePredictionLimitDropdownSelect', "Called handlePredictionLimitDropdownSelect with rank:", rank);
        setPredictionLimit(rank);

        // Assuming playerData is accessible here, might be managed via states or context
        if (playerData && playerData.playerData && playerData.playerData.length > 0) {
            const dates = playerData.playerData.map(item => item.date);
            const ratings = playerData.playerData.map(item => item.rating);

            // Calculate new regression data using the new rank value
            const regressionData = calculateRegressionData(dates, ratings, rank.value);
            Logger.debug('handlePredictionLimitDropdownSelect', "Updated regression data:", regressionData);

            if (regressionData) {
                setRegressionData(regressionData);
                setPlayerData(playerData);
            }
        } else {
            setErrorMessage("No Data Available, Search Again");
            setPlayerData({playerData: []});
        }
    };


    const handleGetDataButton = async () => {
        Logger.debug('handleGetDataButton', "Called handleGetDataButton")
        try {
            // Clear the SVG content
            clearSvgContent();
            setErrorMessage(null);
            setIsLoading(true);

            // Check if the selected player and game type are valid
            if (selectedPlayer && gameType && predictionLimit) {
                Logger.debug('handleGetDataButton', selectedPlayer)
                Logger.debug('handleGetDataButton', gameType)
                await handlePlayerData(selectedPlayer.value, gameType.value);
            }

            setIsLoading(false);
        } catch (error) {
            Logger.error('handleGetDataButton', 'Error:', error);
            setErrorMessage("No Data Available, Search Again");
            // Clear the player data
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
                Logger.error('calculateRegressionData', 'Prediction limit is not a number:', predictionLimit);
            }
        } else {
            Logger.error('calculateRegressionData', 'Dates and ratings are not arrays of the same length:', dates, ratings);
        }
        return null;
    };

    // Function to calculate the regression line
    const calculateRegressionLine = (dates, ratings, predictionLimit) => {

        Logger.debug('calculateRegressionData', "Called calculateRegressionLine")

        if (!dates || !ratings) {
            Logger.error('calculateRegressionData', 'Dates or ratings are undefined');
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

        Logger.debug('setRankOptions', "Called setRankOptions")

        if (selectedPlayer.value !== '') {
            const rating = gameType.value === 'rm_solo' ? selectedPlayer.ratingSolo : selectedPlayer.ratingTeam;
            const gameMode = gameType.value === 'rm_solo' ? "solo" : "team";


            Logger.debug('setRankOptions', rating)
            Logger.debug('setRankOptions', gameMode)

            handleRankOptions(regData, rating, gameMode);
        }
    }

    // Function to set the rank options based on the rating
    const handleRankOptions = (regData, rating, gameMode) => {

        Logger.debug('handleRankOptions', "Called handleRankOptions")
        if (regData.slope > 0) {
            Logger.debug('Slope is positive')
            if (rating > 1600) {
                Logger.debug('Rating is above 1600')
                setErrorMessage(`Sorry, we cant plot for you, your ${gameMode} rating is above Conqueror III.`);
                return;
            }
            if (rating > 1500) {
                Logger.debug('Rating is above 1500')
                setRankPredictOptions(ranksToOptions(ranks.filter(rank => rank.points > 1500)));
                setPredictionLimit(rankPredictOptions[rankPredictOptions.length - 1]);
                return;
            }
            const currentRankIndex = ranks.findIndex(rank => rank.points > rating);
            const nextRank = ranks[currentRankIndex]; // Get the next rank
            setRankPredictOptions(ranksToOptions(ranks.filter(rank => rank.points > nextRank.points)));
            setPredictionLimit(rankPredictOptions[rankPredictOptions.length - 1]);
            Logger.debug('handleRankOptions', rankPredictOptions)
            Logger.debug('handleRankOptions', predictionLimit)
            Logger.debug('handleRankOptions', nextRank)
            Logger.debug('handleRankOptions', currentRankIndex)
        }
        if (regData.slope < 0) {
            Logger.debug('Slope is negative')
            // Set to bronze, all the way down when slope is negative
            const bronzeIRank = ranks.find(rank => rank.name === "Bronze I");
            const bronzeIRankOption = ranksToOptions([bronzeIRank]);
            setRankPredictOptions(bronzeIRankOption);
            setPredictionLimit({value: bronzeIRank.points, label: bronzeIRank.name});
            Logger.debug('handleRankOptions', rankPredictOptions)
            Logger.debug('handleRankOptions', predictionLimit)
            Logger.debug('handleRankOptions', bronzeIRank)
            Logger.debug('handleRankOptions', bronzeIRankOption)
        }
    }

    // Use effect to update the visualization when the dimensions change
    useEffect(() => {
        Logger.debug('useEffect', "Called useEffect")
        // Redraw the SVG with the new dimensions
        if (playerData.playerId === selectedPlayer.value && regressionDataSet && playerData.playerData.length > 0) {
            Logger.debug('useEffect', "Redrawing SVG")
            updateVisualization();
        }

    }, [
        regressionDataSet, playerData, selectedPlayer, updateVisualization
    ]);

    const updateDimensions = useCallback(() => {
        Logger.debug('updateDimensions', "Called updateDimensions")
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
                        defaultOptions
                        inputValue={inputValue}
                        getOptionLabel={e => e.label}
                        getOptionValue={e => e.value}
                        loadOptions={loadOptions}
                        onInputChange={handleInputChange}
                        onChange={handlePlayerDropdownSelect}
                        isLoading={isLoading}
                        components={animatedComponents}
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
                        components={{ Input: CustomInput }}
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
                        components={{ Input: CustomInput }}
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