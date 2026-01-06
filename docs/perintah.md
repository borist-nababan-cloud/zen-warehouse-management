Let modify our PoS Dashboard
1. On Historical section, modify this week filter to show monday to monday of this week (backward date if today not monday).
2. If role_user = 5 or 8 which can read all outlet : 
    - On drop down outlet, show only outlet from master_outlet.active=true.
    - On OperationalDashboardPage and FinancialDashboardPage at section Live monitor add Outlet Option exact like Historical Analysis. so User can read all outlet data or only read data from specific outlet. 
    - On Financial DashboardPage, if user choose All Outlets, add new card exact like Revenue Trend but show each outlet data. 
3. OperationalDashboardPage Section Live Operational Monitor add new card : 
    - Guest Count by gender
    - Guest Count by service_category
4. OperationalDashboardPage Section Historical Operational Analysis
    - On Gender Distribution Card, show vthe value Female and Male on label, so not show on mouse over only. 
    - Remove Room Utilization (Minutes) Card
    - On Therapist Market Share (%) card, shot data by id_therapist Ascending.
    - Add New Card Guest Count by service_category-with value. 
5. FinancialDashboardPage Section Historical Analysis
    - Remove Discount Impact Chart
    - On Payment Mix Card, Also show the value of each payment method.
    - On Bank Reconciliation Card, show the value of each bank account.
Make senses? Do think hard understandings and analysis reasoning and purposes with contexts above, then let me know your thoughts, so we are in the same page (thoughts) before continue with implementations!. Confirm me!

Application tested, login with role_user.id=8(can read all outlet), there are some issue : 
1. FinancialDashboardPage
    a. Historical Analysis Section : 
        - Revenue Trend by Outlet : since currency using Rupiah, on X axis Change the unit M(Million) to Juta.
        - On Payment Mix Card, the content exceeds the box
2. OperationalDashboardPage
    a. Historical Operational Analysis Section : 
        - Guest Count by service_category : the content exceeds the box
        - On each cards Therapist Leaderboard (by Duration) card, Therapist Market Share (%) card and Room Market Share (%) card, at bottom of card, add description with the logic how to calculate the value.
    b. On Room Market Share (%) card, short the data by id_room Ascending.