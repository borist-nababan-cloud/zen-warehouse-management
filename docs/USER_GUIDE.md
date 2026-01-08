# User Guide: PoS Dashboard & AI Chatbot

## Introduction
This guide provides an overview of the **Operational (PoS) Dashboard** and the **AI Chatbot** feature within the Warehouse Management System. These tools are designed to help you monitor store performance and get intelligent insights from your data.

## 1. Operational (PoS) Dashboard

The "PoS Dashboard" (labeled as **Operational Performance** in the application) is your central hub for monitoring real-time and historical store activities.

**Accessing the Dashboard:**
1.  Log in to the application.
2.  Navigate to the **Operational Dashboard** via the sidebar menu (if available for your role) or the main dashboard module grid.

### Key Features

#### A. Live Monitor
The **Operational Live Section** provides real-time visibility into current store operations.
-   **Outlet Selection**: If you have access to multiple outlets (e.g., Admin, Superuser), use the dropdown to switch views between specific stores.
-   **Real-time Metrics**: View live stats such as current active orders, tables occupied, or recent transactions (depending on active configuration).

#### B. Historical Analysis
The **Operational Historical Section** allows you to analyze past performance.
-   **Date Range**: Filter data by Date (Today, Yesterday, Last 7 Days, etc.).
-   **Trend Charts**: Visual graphs showing sales trends, peak hours, and product performance over time.

---

## 2. AI Chatbot Assistant

The **Zen AI Assistant** is an intelligent feature integrated directly into your dashboard to help you analyze data without needing complex reports.

### Availability
*   **Roles**: Currently available to **Finance** (Role 5) and **Superuser** (Role 8).
*   **Location**: Found as a **floating action button** (bubble icon) at the bottom-right corner of the *Operational Dashboard* and other supported pages.

### How to Use

1.  **Open the Chat**: Click the floating bubble icon <img src="https://lucide.dev/icons/message-square" width="16" style="vertical-align:middle"/> in the bottom-right corner.
2.  **Ask a Question**: Type your question in the input field. The AI is **context-aware**, meaning it knows what data you are currently looking at on the screen.
    *   *Example 1:* "Why were sales low yesterday?"
    *   *Example 2:* "What are the top 3 selling products this week?"
    *   *Example 3:* "Summarize the operational performance for Outlet A."
3.  **View Response**: The AI will process your query using the current screen's data and provide a detailed answer, often with markdown formatting for better readability.

### Context Awareness
When you chat with the AI on the **Operational Dashboard**, it automatically receives:
-   **Your Role**: To tailor the complexity of the answer.
-   **Selected Outlet**: To focus the analysis on the specific store you are viewing.
-   **Dashboard Data**: It "sees" the same metrics and charts available on your screen.

### Troubleshooting
-   **"Thinking..."**: The AI is processing your request. This may take a few seconds.
-   **Error Messages**: If the AI backend is unreachable, an error message will appear in the chat. Ensure your internet connection is stable.

---

## 3. Roles & Permissions

| Feature | Admin Holding | Staff Holding | Finance | Superuser |
| :--- | :---: | :---: | :---: | :---: |
| **View Operational Dashboard** | ✅ | ✅ | ✅ | ✅ |
| **Use AI Chatbot** | ❌ | ❌ | ✅ | ✅ |

> **Note**: If you do not see the Chatbot icon, please verify that you are logged in with a user account that has the **Finance** or **Superuser** role.
