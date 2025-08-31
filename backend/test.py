import fastf1
import pandas as pd
import datetime

schedule = fastf1.get_event_schedule(2025)

# pandas Timestamp bez strefy czasowej
now = pd.Timestamp.now().tz_localize(None)

past = schedule[schedule['Session5DateUtc'] <= now]

if past.empty:
    print("Jeszcze żaden wyścig się nie odbył w sezonie 2025.")
else:
    last = past.loc[past['Session5DateUtc'].idxmax()]
    print(f"Ostatni wyścig to runda {last['RoundNumber']}: {last['EventName']} ({last['Session5DateUtc']})")
