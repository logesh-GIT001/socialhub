#!/usr/bin/env bash

# SocialHub Enterprise Startup Script
# Automatically configures, installs dependencies, and runs services.

# Text formatting helpers
INFO='\033[0;36m'
SUCCESS='\033[0;32m'
WARNING='\033[0;33m'
ERROR='\033[0;31m'
BOLD='\033[1m'
NC='\033[0m' # No Color

echo -e "${INFO}${BOLD}"
echo "=========================================================="
echo "         SOCIALHUB ENTERPRISE STARTUP UTILITY             "
echo "=========================================================="
echo -e "${NC}"

# Check if we are running in the correct directory
if [ ! -d "backend" ] || [ ! -d "frontend" ]; then
    echo -e "${ERROR}Error: Please run this script from the root of the socialhub project.${NC}"
    exit 1
fi

# Function to clean up background processes on exit
cleanup() {
    echo ""
    if [ -n "$TAIL_PID" ]; then
        kill "$TAIL_PID" 2>/dev/null
    fi
    if [ -n "$BACKEND_PID" ]; then
        echo -e "${INFO}Stopping backend server (PID $BACKEND_PID)...${NC}"
        kill "$BACKEND_PID" 2>/dev/null
    fi
    echo -e "${SUCCESS}All services stopped cleanly.${NC}"
    exit
}
trap cleanup SIGINT SIGTERM EXIT

run_docker() {
    echo -e "${INFO}Checking Docker requirements...${NC}"
    if ! command -v docker &> /dev/null; then
        echo -e "${ERROR}Error: docker is not installed. Please install Docker first.${NC}"
        exit 1
    fi

    # Check for docker-compose (v1 or v2)
    DOCKER_COMPOSE_CMD=""
    if docker compose version &> /dev/null; then
        DOCKER_COMPOSE_CMD="docker compose"
    elif command -v docker-compose &> /dev/null; then
        DOCKER_COMPOSE_CMD="docker-compose"
    else
        echo -e "${ERROR}Error: docker compose (v2) or docker-compose (v1) is not installed.${NC}"
        exit 1
    fi

    echo -e "${SUCCESS}Starting SocialHub via Docker Compose...${NC}"
    $DOCKER_COMPOSE_CMD up --build
}

run_local() {
    echo -e "${INFO}Checking local environment requirements...${NC}"
    
    # 1. Python check
    if ! command -v python3 &> /dev/null; then
        echo -e "${ERROR}Error: python3 is not installed or not in PATH.${NC}"
        exit 1
    fi

    # 2. Node/NPM check
    if ! command -v npm &> /dev/null; then
        echo -e "${ERROR}Error: npm is not installed or not in PATH.${NC}"
        exit 1
    fi

    # --- Setup Backend ---
    echo -e "\n${INFO}Setting up Backend (FastAPI)...${NC}"
    cd backend || exit 1
    
    if [ ! -d "venv" ]; then
        echo -e "${WARNING}Virtual environment 'venv' not found. Creating it...${NC}"
        python3 -m venv venv
    fi

    echo -e "${INFO}Activating virtual environment and installing dependencies...${NC}"
    source venv/bin/activate
    pip install --upgrade pip
    pip install -r requirements.txt
    
    echo -e "${SUCCESS}Backend setup completed.${NC}"
    cd ..

    # --- Setup Frontend ---
    echo -e "\n${INFO}Setting up Frontend (Next.js)...${NC}"
    cd frontend || exit 1
    
    if [ ! -d "node_modules" ]; then
        echo -e "${WARNING}node_modules not found. Running npm install...${NC}"
        npm install
    fi
    
    echo -e "${SUCCESS}Frontend setup completed.${NC}"
    cd ..

    # --- Start Services ---
    echo -e "\n${SUCCESS}${BOLD}Starting Services...${NC}"
    echo -e "${INFO}API Swagger documentation: ${BOLD}http://localhost:8000/docs${NC}"
    echo -e "${INFO}Frontend Interface:        ${BOLD}http://localhost:3000${NC}"
    echo -e "${WARNING}Press Ctrl+C to stop both backend and frontend.${NC}\n"

    # Clear previous backend log if exists
    rm -f backend/backend.log
    touch backend/backend.log

    # Start backend in background and log to backend.log
    cd backend || exit 1
    source venv/bin/activate
    uvicorn app.main:app --reload --host 127.0.0.1 --port 8000 > backend.log 2>&1 &
    BACKEND_PID=$!
    cd ..

    # Wait a moment to ensure backend starts successfully
    sleep 2
    if ! kill -0 $BACKEND_PID 2>/dev/null; then
        echo -e "${ERROR}Backend failed to start. Check backend/backend.log for errors:${NC}"
        cat backend/backend.log
        exit 1
    fi
    echo -e "${SUCCESS}Backend is running in background (PID: $BACKEND_PID).${NC}"

    # Tail the backend logs in background to merge them with the console output
    tail -f backend/backend.log &
    TAIL_PID=$!

    # Start frontend in foreground
    cd frontend || exit 1
    npm run dev
}

# Check command line arguments
if [ "$1" = "docker" ] || [ "$1" = "-d" ] || [ "$1" = "--docker" ]; then
    run_docker
elif [ "$1" = "local" ] || [ "$1" = "-l" ] || [ "$1" = "--local" ]; then
    run_local
else
    # Interactive menu
    echo "How would you like to run SocialHub?"
    echo "  1) Docker Compose (Complete multi-container production stack)"
    echo "  2) Local Standalone (SQLite backend & Next.js frontend)"
    echo "  3) Exit"
    echo -n "Select option [1-3]: "
    read -r opt
    
    case $opt in
        1)
            run_docker
            ;;
        2)
            run_local
            ;;
        *)
            echo "Exiting."
            exit 0
            ;;
    esac
fi
