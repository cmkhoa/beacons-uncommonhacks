# Beacon

**Automated medical supply management for hospital staff.**

In a medical crisis, nurses and doctors do not have time to fill out complex forms or wait on hold to find supplies. Beacon simplifies this process by using voice AI and automated agents to track inventory and move supplies where they are needed most.

---

## The Problem

When a hospital runs out of critical gear, like masks or ventilators, staff have to spend time making phone calls to find replacements. Often, another hospital nearby has a surplus, but there is no fast way to see that or request it. Manual tracking is slow and takes staff away from patients.

---

## How It Works

### 1. Voice Interface for Staff
Nurses interact with Beacon using voice commands powered by Eleven Labs. Instead of typing into a dashboard, a nurse can simply say, "We just used five ventilators" or "Our mask count is getting low."

### 2. Intelligent Inventory Agent
An automated agent processes these voice commands and updates the hospital's digital inventory in real time. The agent monitors stock levels against set safety thresholds.

### 3. Automated Supply Requests
If the agent sees that an item has dropped below its safe threshold, it automatically triggers a search for help. 

The system:
- Finds the nearest hospital with enough extra stock of that specific item.
- Creates a request to move those supplies.
- Notifies the dispatchers or staff at both locations.

### 4. Smart Matching Algorithm
The matching logic uses simple distance math and inventory checks to ensure supplies travel the shortest path possible. This happens instantly, without anyone needing to pick up a phone.

---

## Tech Stack

- **Voice AI**: Eleven Labs for the nurse interface.
- **Database**: Firebase for real-time inventory tracking.
- **Backend**: Node.js to run the inventory agent and matching logic.
- **Frontend**: React and Tailwind for a clean, simple dashboard for dispatchers.
- **Maps**: Mapbox to show supply routes and hospital locations.

---

## The Demo

1. **Voice Command**: A nurse tells the system that a hospital is low on a specific item.
2. **Threshold Hit**: The inventory agent updates the count and realizes it is below the safety limit.
3. **Auto-Match**: The system instantly finds a neighbor with a surplus and draws a route on the map.
4. **Result**: A supply run is scheduled automatically before the staff even finishes their shift.

---

## Project Goal

The goal of Beacon is to take the paperwork and guesswork out of hospital logistics. By using voice and automation, we let medical staff focus on saving lives while the system handles the supplies.

---

*Built for Uncommon Hacks.*
