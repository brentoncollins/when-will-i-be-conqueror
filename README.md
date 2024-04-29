# When Will I Be Conqueror?

Ever wondered when you'll rise from the gold leagues to become a Conqueror in Age of Empires IV? 
"When Will I Be Conqueror?" is a web application that predicts when you'll reach the top ranks using linear regression. 
Plug in your AoE4 player name, and let the magic of data chart your path to glory!

This is not an official AoE4 World API project or affiliated with Microsoft. Just a fun project to learn Go and React.

## Features

- **Predictive Analysis**: Uses linear regression to forecast your future rank based on current game data.
- **Player Insights**: Input your player name to receive a personalized rank ascension trajectory.
- **Dynamic Updates**: Integrates current season data from the AoE4 World API.

## Limitations

- Predictions are more accurate for players with a positive game trajectory.
- Not applicable for players already in the Conqueror rank.
- The first 5 placement games of the season are excluded.
- In cases where games show no rating, the previous rating is used.

## Tech Stack

- **Frontend**: Implemented with Node.js
- **Backend**: Developed using Go
- **Containerization**: Tied together in a Docker container for seamless deployment and scalability.

## Getting Started

To set up the project locally:

1. Clone the repository:
   ```bash
   git clone https://github.com/yourgithub/when-will-i-be-conqueror.git

2. Navigate into the project directory:
    ```bash
    cd when-will-i-be-conqueror
    ```
3. Install the dependencies:
    ```bash
    cd frontend 
    npm install
    ```

3. Build the Docker container (Set the environment variable SEASON_START_TIMESTAMP to the start of the current season):
    ```bash 
   cd ..
   docker build -t when-will-i-be-conqueror -f deploy/Dockerfile .
   docker run -e SEASON_START_TIMESTAMP=1710777600 -p 5000:5000 aoe4-when-will-i-be-conc
   ```
   

### Contributing
Feel free to fork the repository and submit pull requests. 
You can also send your feedback and feature requests to brenton.collins@outlook.com.

Report any bugs or issues on the issues page.
Check for any open tasks or feature requests that might interest you.

### Acknowledgments
Data provided by AoE4 World API.

Please read the terms of use for the AoE4 World API before using this project. (https://aoe4world.com/api)

This project was created as a personal project to learn Go and React.


### License
Distributed under the MIT License. See LICENSE for more information.