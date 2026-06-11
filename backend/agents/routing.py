import heapq

# Mock track availability matrix/graph
# Weights represent travel time in minutes
TRACK_GRAPH = {
    "Kanpur Central": {"Prayagraj": 120, "Lucknow": 90, "Agra Cantt": 150},
    "Prayagraj": {"Kanpur Central": 120, "Varanasi": 100, "Mughalsarai": 110},
    "Lucknow": {"Kanpur Central": 90, "Varanasi": 160},
    "Agra Cantt": {"Kanpur Central": 150, "New Delhi": 120},
    "New Delhi": {"Agra Cantt": 120},
    "Varanasi": {"Prayagraj": 100, "Lucknow": 160, "Mughalsarai": 30},
    "Mughalsarai": {"Prayagraj": 110, "Varanasi": 30}
}

def dijkstra_route_discovery(start: str, target: str) -> dict:
    if start not in TRACK_GRAPH or target not in TRACK_GRAPH:
         return {"route": [], "cost": -1, "status": "No graph data"}

    distances = {node: float('infinity') for node in TRACK_GRAPH}
    distances[start] = 0
    pq = [(0, start)]
    previous = {node: None for node in TRACK_GRAPH}

    while pq:
        current_dist, current_node = heapq.heappop(pq)

        if current_node == target:
            break

        if current_dist > distances[current_node]:
            continue

        for neighbor, weight in TRACK_GRAPH[current_node].items():
            distance = current_dist + weight
            if distance < distances[neighbor]:
                distances[neighbor] = distance
                previous[neighbor] = current_node
                heapq.heappush(pq, (distance, neighbor))

    route = []
    curr = target
    while curr is not None:
        route.append(curr)
        curr = previous[curr]
    route.reverse()

    if len(route) == 1 and start != target:
        return {"route": [], "cost": -1, "status": "No path found"}

    return {"route": route, "cost": distances[target], "status": "Success"}
