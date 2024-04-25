import * as d3 from "d3";
const apiUrl = process.env.NODE_ENV === 'production' ? process.env.REACT_APP_PROD_API_URL : process.env.REACT_APP_DEV_API_URL;


export const updateVisualization = (data,
                                    x1,
                                    y1,
                                    x2,
                                    y2,
                                    slope,
                                    intercept,
                                    playerName,
                                    svgRef,
                                    width,
                                    height,
                                    margin,
                                    predictionLimit) => {


    console.log('updateVisualization data:', data);
    console.log('updateVisualization x1:', x1);
    console.log('updateVisualization y1:', y1);
    console.log('updateVisualization x2:', x2);
    console.log('updateVisualization y2:', y2);
    console.log('updateVisualization slope:', slope);
    console.log('updateVisualization intercept:', intercept);
    console.log('updateVisualization playerName:', playerName);
    console.log('updateVisualization svgRef:', svgRef);
    console.log('updateVisualization width:', width);
    console.log('updateVisualization height:', height);
    console.log('updateVisualization margin:', margin);
    console.log('updateVisualization predictionLimit:', predictionLimit);


    console.log(data)


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
    const maxY = Math.max(predictionLimit, Math.max(...data.map(d => d.rating)));

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
        .attr("cx", function(d) { return xScale(d.date) })
        .attr("cy", function(d) { return yScale(d.rating) })
        .attr("r", 1) // Radius size, you can adjust as needed
        .attr("fill", "white"); // Fill color, you can adjust as needed

    const ranks = [
        {name: 'Bronze I', points: 300, max_width: 1200,color: 'Bronze', filename: 'https://www.when-will-i-be-conqueror.com/images/bronze_1.svg'},
        {name: 'Bronze II', points: 400, max_width: 500,color: 'Bronze', filename: 'https://www.when-will-i-be-conqueror.com/images/bronze_2.svg'},
        {name: 'Bronze III', points: 500, max_width: 300,color: 'Bronze', filename: 'https://www.when-will-i-be-conqueror.com/images/bronze_3.svg'},
        {name: 'Silver I', points: 600, max_width: 1200,color: 'Silver', filename: 'https://www.when-will-i-be-conqueror.com/images/silver_1.svg'},
        {name: 'Silver II', points: 650, max_width: 500,color: 'Silver', filename: 'https://www.when-will-i-be-conqueror.com/images/silver_2.svg'},
        {name: 'Silver III', points: 700, max_width: 300,color: 'Silver', filename: 'https://www.when-will-i-be-conqueror.com/images/silver_3.svg'},
        {name: 'Gold I', points: 800, max_width: 1200,color: 'Gold', filename: 'https://www.when-will-i-be-conqueror.com/images/gold_1.svg'},
        {name: 'Gold II', points: 850, max_width: 500,color: 'Gold', filename: 'https://www.when-will-i-be-conqueror.com/images/gold_2.svg'},
        {name: 'Gold III', points: 900, max_width: 300,color: 'Gold', filename: 'https://www.when-will-i-be-conqueror.com/images/gold_3.svg'},
        {name: 'Platinum I', points: 1000, max_width: 1200,color: 'Platinum', filename: 'https://www.when-will-i-be-conqueror.com/images/platinum_1.svg'},
        {name: 'Platinum II', points: 1050, max_width: 500,color: 'Platinum', filename: 'https://www.when-will-i-be-conqueror.com/images/platinum_2.svg'},
        {name: 'Platinum III', points: 1100, max_width: 300,color: 'Platinum', filename: 'https://www.when-will-i-be-conqueror.com/images/platinum_3.svg'},
        {name: 'Diamond I', points: 1200, max_width: 1200,color: 'Blue', filename: 'https://www.when-will-i-be-conqueror.com/images/diamond_1.svg'},
        {name: 'Diamond II', points: 1250, max_width: 500,color: 'Blue', filename: 'https://www.when-will-i-be-conqueror.com/images/diamond_2.svg'},
        {name: 'Diamond III', points: 1300, max_width: 300,color: 'Blue', filename: 'https://www.when-will-i-be-conqueror.com/images/diamond_3.svg'},
        {name: 'Conqueror I', points: 1400, max_width: 1200,color: 'Yellow', filename: 'https://www.when-will-i-be-conqueror.com/images/conqueror_1.svg'},
        {name: 'Conqueror II', points: 1500, max_width: 500,color: 'Yellow', filename: 'https://www.when-will-i-be-conqueror.com/images/conqueror_2.svg'},
        {name: 'Conqueror III', points: 1600, max_width: 300,color: 'Red', filename: 'https://www.when-will-i-be-conqueror.com/images/conqueror_3.svg'}
    ];

    console.log(ranks)
    console.log('slope:', slope);
    console.log('intercept:', intercept);

    ranks.forEach(rank => {

        if ((rank.max_width < width) || (rank.points === predictionLimit)) {

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
        }}
    });



}



export const fetchPlayerDataOnly = async (playerId, gameType, predictionLimit) => {
    try {
        console.log('fetchPlayerDataOnly fetching data for player:', playerId);
        console.log('fetchPlayerDataOnly fetching data for gameType:', gameType);
        console.log('fetchPlayerDataOnly fetching data for predictionLimit:', predictionLimit);
        const response = await fetch(`${apiUrl}/get_player_data?playerID=${playerId}&gameType=${gameType}&predictionLimit=${predictionLimit}`);
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
            playerData: dates.map((date, i) => ({ date, rating: ratings[i] })),
            playerName: playerData.player_name,
            playerId: playerData.player_id
        };
    } catch (error) {
        console.error("fetchPlayerDataOnly Failed to fetch data:", error)
        return {playerData: []};
    }
};