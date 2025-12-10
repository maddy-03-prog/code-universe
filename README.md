# code-universe #MAD IDE

MAD IDE is a lightweight, multi-language coding environment that I am building completely from scratch.
It focuses on simplicity, clean UI, and a smooth coding experience across multiple programming languages.


---

🚀 About the Project

MAD IDE is designed as a mini–developer environment that supports multiple programming workspaces.
Even though the shared screenshot displays only the Python workspace, the IDE supports:

Python

Java

C

C++

SQL

The goal of this project is to understand how real development tools are engineered and to build an IDE that is simple, fast, and highly functional.


---

✨ Features Completed

✔️ Core editor interface
✔️ File structure & layout system
✔️ Multi-workspace support
✔️ Syntax preview
✔️ Live output area
✔️ Smooth UI/UX improvements
✔️ Component structuring with React (WIP)


---

🛠️ Tech Stack

Frontend: HTML, CSS, JavaScript, React

Languages Supported: Python, Java, C, C++, SQL

Project Type: Custom-built IDE (not dependent on Replit or any external IDE platform)



---

📈 Current Progress

Feature	Status

Core UI/UX	70%
Real-time code preview	80%
React-based component structure	60%
Responsive layout	40%
Multi-language execution	In progress
HTML/CSS/JS & React execution	Upcoming

⚙️ Phase 1 — Installation

📦 Frontend Setup

cd frontend
npm install
# Return to the project root
cd ..


---

🖥️ Backend Setup

# Create virtual environment
python -m venv venv

# Activate (Windows)
.\venv\Scripts\activate

# Activate (Mac/Linux)
# source venv/bin/activate

# Install dependencies
pip install -r requirements.txt


---

🔐 Phase 2 — Environment Injection

Create a .env file inside the backend folder:

# ==== Server Config ====
PORT=5000
HOST=localhost

# ==== Runtime Settings ====
ENABLE_LOGS=true
APP_MODE=development

(Add your own environment variables later as your project grows)


---

🔥 Phase 3 — System Ignition

1️⃣ Start Backend Engine (Compiler Service)

python backend/server.py
# ONLINE @ http://localhost:5000


---

2️⃣ AI/Logic Engine (Optional Future Add-on)

python engine.py dev
# LISTENING for computation / execution


---

3️⃣ Start Frontend (Interface)

cd frontend
npm run dev
# Running @ http://localhost:5173


---

🛠️ Runtime Best Practices

Automatic refresh on file change

Smooth editor rendering

Live output preview

Multi-workspace toggle support

Lightweight execution simulation

🚧 Upcoming Features (In Progress)

⏳ React-based component architecture

⏳ Live real-time execution output

⏳ HTML/CSS/JavaScript workspace

⏳ File Explorer & Tabs

⏳ Monaco Editor (VS Code UI)

⏳ Full backend compiler integration

