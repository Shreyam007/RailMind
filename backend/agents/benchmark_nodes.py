import timeit
import random

# Mock data
severities = ["low", "medium", "high", "critical"]
anomalies = [{"severity": random.choice(severities)} for _ in range(1000)]

def current_impl():
    severity_rank = {"low": 1, "medium": 2, "high": 3, "critical": 4}
    highest_severity = "low"
    highest_rank = 0
    for anomaly in anomalies:
        sev = anomaly.get("severity", "low").lower()
        rank = severity_rank.get(sev, 1)
        if rank > highest_rank:
            highest_rank = rank
            highest_severity = sev

    has_critical = any(anomaly.get("severity", "").lower() == "critical" for anomaly in anomalies)
    operations_urgency = "high" if has_critical else "medium"
    return operations_urgency

def new_impl():
    severity_rank = {"low": 1, "medium": 2, "high": 3, "critical": 4}
    highest_severity = "low"
    highest_rank = 0
    has_critical = False

    for anomaly in anomalies:
        sev = anomaly.get("severity", "low").lower()
        rank = severity_rank.get(sev, 1)
        if rank > highest_rank:
            highest_rank = rank
            highest_severity = sev
            if highest_rank == 4:
                break

    has_critical = (highest_severity == "critical")
    operations_urgency = "high" if has_critical else "medium"
    return operations_urgency

print("Current:", timeit.timeit(current_impl, number=10000))
print("New:", timeit.timeit(new_impl, number=10000))
