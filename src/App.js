import React, {useCallback, useEffect, useRef, useState} from 'react';
import Select from 'react-select';
import makeAnimated from 'react-select/animated';
import AsyncSelect from 'react-select/async';
import {ranks, ranksToOptions} from "./ranks";
import {fetchPlayerDataOnly, updateVisualization} from './updateViz';
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
            setRankOptions();
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
                console.log('handlePlayerData Player data:', playerData);
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


    // Function to update the dimensions of the SVG
    const updateDimensions = useCallback(() => {
        // Get the new dimensions
        const dimensions = getViewportDimensions();

        // Redraw the SVG with the new dimensions
        if (playerData.playerData && playerData.playerData.length > 0 && regressionDataSet) {
            console.log('Update Dimensions Player Data:', playerData.playerData);
            console.log('Update Dimensions Regression Data:', regressionDataSet);
            console.log('Update Dimensions Prediction Limit:', predictionLimit);
            console.log('Update Dimensions Dimensions:', dimensions);
            console.log('Update Dimensions SVG Ref:', svgRef);
            updateVisualization(
                playerData.playerData,
                regressionDataSet.x1,
                regressionDataSet.y1,
                regressionDataSet.x2,
                regressionDataSet.y2,
                regressionDataSet.slope,
                regressionDataSet.intercept,
                playerData.playerName,
                svgRef,
                dimensions.width,
                dimensions.height,
                dimensions.padding,
                predictionLimit.value
            );
        }
    }, [
        getViewportDimensions,
        playerData,
        regressionDataSet,
        predictionLimit.value
    ]);


    // Function to set the rank options
    const setRankOptions = (regData) => {
        console.log("setRankOptions Setting rank options")
        console.log("setRankOptions Selected Rank", gameType.value)
        console.log("setRankOptions Selected Player", selectedPlayer)
        if (selectedPlayer.value !== '') {
            const rating = gameType.value === 'rm_solo' ? selectedPlayer.ratingSolo : selectedPlayer.ratingTeam;
            const gameMode = gameType.value === 'rm_solo' ? "solo" : "team";
            console.log('Handle Rank Options:', rating, gameMode)
            handleRankOptions(regData, rating, gameMode);
        }
    }

    // Function to set the rank options based on the rating
    const handleRankOptions = (regData, rating, gameMode) => {
        console.log('Player Data Slope:', regData.slope)
        if(regData.slope > 0) {
            console.log(`setRankOptions Setting rank options for ${gameMode}`)
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
        if (regData.slope <0){
            // Set to bronze, all the way down when slope is negative
            const bronzeIRank = ranks.find(rank => rank.name === "Bronze I");
            const bronzeIRankOption = ranksToOptions([bronzeIRank]);
            setRankPredictOptions(bronzeIRankOption);
            setPredictionLimit({value: bronzeIRank.points, label: bronzeIRank.name});

        }
    }

    // Use effect to update the visualization when the dimensions change
    useEffect(() => {
        // Get the new dimensions

        const dimensions = getViewportDimensions();
        // Redraw the SVG with the new dimensions
        if (playerData.playerId === selectedPlayer.value && regressionDataSet && playerData.playerData.length > 0) {
            updateVisualization(
                playerData.playerData,
                regressionDataSet.x1,
                regressionDataSet.y1,
                regressionDataSet.x2,
                regressionDataSet.y2,
                regressionDataSet.slope,
                regressionDataSet.intercept,
                playerData.playerName,
                svgRef,
                dimensions.width,
                dimensions.height,
                dimensions.padding,
                predictionLimit.value
            );
        }

    }, [
        getViewportDimensions,
        playerData,
        regressionDataSet,
        predictionLimit,
        selectedPlayer,
    ]);


    useEffect(() => {
        console.log('Use effect resize called')
        window.addEventListener('resize', updateDimensions);

        // Cleanup function to remove the event listener when the component unmounts
        return () => window.removeEventListener('resize', updateDimensions);
    }, [updateDimensions]);


    useEffect(() => {
        console.log('Use effect input value called')
        const timerId = setTimeout(() => {
            console.log('Debounced input value:', inputValue);
            handleSearchTextInput(inputValue);
        }, 1000);
        console.log('Timer ID:', timerId);
        console.log('Input value:', inputValue);
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