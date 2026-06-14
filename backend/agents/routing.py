import heapq

# Station Name to Code mapping
STATION_NAME_TO_CODE = {
    "New Delhi": "NDLS",
    "Delhi Junction": "DLI",
    "Kanpur Central": "CNB",
    "Lucknow": "LKO",
    "Prayagraj": "ALD",
    "Allahabad": "ALD",
    "Varanasi": "BSB",
    "Gorakhpur": "GKP",
    "Agra Cantt": "AGC",
    "Mathura": "MTJ",
    "Aligarh": "ALJN",
    "Moradabad": "MB",
    "Saharanpur": "SRE",
    "Ambala": "AMB",
    "Amritsar": "ASR",
    "Ludhiana": "LDH",
    "Ambala Cantt": "UMB",
    "Haridwar": "HW",
    "Dehradun": "DDN",
    "Patna": "PNBE",
    "Rajendra Nagar": "RJPB",
    "Bhagalpur": "BGP",
    "Muzaffarpur": "MFP",
    "Darbhanga": "DBG",
    "Samastipur": "SPJ",
    "Dhanbad": "DHN",
    "Jasidih": "JSME",
    "Ranchi": "RNC",
    "Howrah": "HWH",
    "Sealdah": "SDAH",
    "Kolkata": "KOAA",
    "Bandel": "BDC",
    "Bardhaman": "BWN",
    "Kharagpur": "KGP",
    "Mumbai CST": "CSTM",
    "Mumbai Central": "BCT",
    "Lokmanya Tilak": "LTT",
    "Pune": "PUNE",
    "Nagpur": "NGP",
    "Aurangabad": "AWB",
    "Nanded": "NED",
    "Solapur": "SUR",
    "Bangalore City": "SBC",
    "Yesvantpur": "YPR",
    "Hubli": "UBL",
    "Mysuru": "MYS",
    "Chennai Central": "MAS",
    "Chennai Egmore": "MS",
    "Tiruchirappalli": "TPJ",
    "Madurai": "MDU",
    "Coimbatore": "CBE",
    "Nagercoil": "NCJ",
    "Thiruvananthapuram": "TVC",
    "Ernakulam": "ERS",
    "Kozhikode": "CLT",
    "Shoranur": "SRR",
    "Secunderabad": "SC",
    "Hyderabad": "HYB",
    "Vijayawada": "BZA",
    "Visakhapatnam": "VSKP",
    "Guntur": "GNT",
    "Ahmedabad": "ADI",
    "Vadodara": "BRC",
    "Surat": "ST",
    "Rajkot": "RJT",
    "Bhopal": "BPL",
    "Jabalpur": "JBP",
    "Gwalior": "GWL",
    "Indore": "INDB",
    "Itarsi": "ET",
    "Jaipur": "JP",
    "Ajmer": "AII",
    "Jodhpur": "JU",
    "Bikaner": "BKN",
    "Udaipur": "UDZ",
    "Bhubaneswar": "BBS",
    "Cuttack": "CTC",
    "Puri": "PURI",
    "Guwahati": "GHY",
    "Dibrugarh": "DBRG"
}

# Major Indian railway network graph (station codes)
# Weights represent travel time in minutes
TRACK_GRAPH = {
    "NDLS": {"ALJN": 120, "MTJ": 90, "UMB": 180, "SRE": 180, "LKO": 240},
    "ALJN": {"NDLS": 120, "CNB": 180, "MTJ": 90, "LKO": 150},
    "CNB": {"ALJN": 180, "ALD": 120, "LKO": 90, "GWL": 180},
    "ALD": {"CNB": 120, "BSB": 100, "LKO": 120, "JBP": 240},
    "BSB": {"ALD": 100, "PNBE": 150, "LKO": 160},
    "PNBE": {"BSB": 150, "JSME": 180},
    "JSME": {"PNBE": 180, "DHN": 120},
    "DHN": {"JSME": 120, "BWN": 120},
    "BWN": {"DHN": 120, "HWH": 90},
    "HWH": {"BWN": 90, "KGP": 120},
    
    "MTJ": {"NDLS": 90, "ALJN": 90, "AGC": 45},
    "AGC": {"MTJ": 45, "GWL": 90},
    "GWL": {"AGC": 90, "VGLJ": 120, "CNB": 180},
    "VGLJ": {"GWL": 120, "BPL": 180},
    "BPL": {"VGLJ": 180, "NGP": 240, "JBP": 180},
    "NGP": {"BPL": 240, "BZA": 360, "JBP": 180},
    "BZA": {"NGP": 360, "MAS": 300, "VSKP": 300},
    "MAS": {"BZA": 300, "MS": 20},
    
    "BCT": {"BRC": 240, "PUNE": 180},
    "BRC": {"BCT": 240, "ST": 120},
    "ST": {"BRC": 120, "ADI": 180},
    "ADI": {"ST": 180},
    
    "PUNE": {"BCT": 180, "SUR": 240},
    "SUR": {"PUNE": 240, "UBL": 300},
    "UBL": {"SUR": 300, "SBC": 360},
    "SBC": {"UBL": 360, "MS": 240, "YPR": 30},
    "YPR": {"SBC": 30},
    "MS": {"MAS": 20, "SBC": 240},
    
    "KGP": {"HWH": 120, "CTC": 180},
    "CTC": {"KGP": 180, "BBS": 30},
    "BBS": {"CTC": 30, "VSKP": 360},
    "VSKP": {"BBS": 360, "BZA": 300},
    
    "ASR": {"LDH": 120},
    "LDH": {"ASR": 120, "UMB": 120},
    "UMB": {"LDH": 120, "NDLS": 180},
    
    "SRE": {"NDLS": 180, "HW": 60},
    "HW": {"SRE": 60, "DDN": 90},
    "DDN": {"HW": 90},
    
    "LKO": {"CNB": 90, "ALD": 120, "BSB": 160, "NDLS": 240, "ALJN": 150},
    "JBP": {"BPL": 180, "ALD": 240, "NGP": 180}
}

def resolve_code(station: str) -> str:
    """
    Resolves an input station name or code to its standard code.
    """
    if not station:
        return ""
    station_clean = station.strip()
    if station_clean in TRACK_GRAPH:
        return station_clean
    # Try direct name to code matching
    for name, code in STATION_NAME_TO_CODE.items():
        if name.lower() == station_clean.lower():
            return code
    # Try fuzzy name matching
    for name, code in STATION_NAME_TO_CODE.items():
        if station_clean.lower() in name.lower() or name.lower() in station_clean.lower():
            return code
    return station_clean

def dijkstra_route_discovery(start: str, target: str, blocked_station: str = None) -> dict:
    """
    Dijkstra shortest path algorithm. Optional blocked_station parameter will 
    exclude transitions to that station to find detours.
    """
    start_code = resolve_code(start)
    target_code = resolve_code(target)
    blocked_code = resolve_code(blocked_station) if blocked_station else None
    
    if start_code not in TRACK_GRAPH or target_code not in TRACK_GRAPH:
         return {
             "route": [], 
             "cost": -1, 
             "status": f"No graph data for codes: {start_code} / {target_code}"
         }

    distances = {node: float('infinity') for node in TRACK_GRAPH}
    distances[start_code] = 0
    pq = [(0, start_code)]
    previous = {node: None for node in TRACK_GRAPH}

    while pq:
        current_dist, current_node = heapq.heappop(pq)

        if current_node == target_code:
            break

        if current_dist > distances[current_node]:
            continue

        for neighbor, weight in TRACK_GRAPH[current_node].items():
            # Bypass blocked station
            if blocked_code and neighbor == blocked_code:
                continue
                
            distance = current_dist + weight
            if distance < distances[neighbor]:
                distances[neighbor] = distance
                previous[neighbor] = current_node
                heapq.heappush(pq, (distance, neighbor))

    route = []
    curr = target_code
    while curr is not None:
        route.append(curr)
        curr = previous[curr]
    route.reverse()

    if len(route) == 1 and start_code != target_code:
        return {"route": [], "cost": -1, "status": "No path found"}

    return {"route": route, "cost": distances[target_code], "status": "Success"}
