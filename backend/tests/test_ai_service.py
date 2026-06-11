import pytest
import json
from unittest.mock import patch, AsyncMock, MagicMock
from backend.services.ai_service import reason_with_ai

@pytest.mark.asyncio
async def test_reason_with_ai_empty_anomalies():
    result = await reason_with_ai([])
    assert result == {}

@pytest.mark.asyncio
@patch("backend.services.ai_service.client.aio.models.generate_content", new_callable=AsyncMock)
async def test_reason_with_ai_success(mock_generate_content):
    expected_response = {
        "incident_title": "Test Title",
        "situation_summary": "Test Summary",
        "reroute_plan": "Test Reroute",
        "maintenance_task": "Test Maintenance",
        "operations_task": "Test Operations",
        "station_manager_task": "Test Station Manager",
        "passenger_sms": "Test SMS",
        "incident_summary": "Test Incident Summary"
    }

    mock_response = MagicMock()
    mock_response.text = json.dumps(expected_response)
    mock_generate_content.return_value = mock_response

    anomalies = [{"train_name": "Test Train", "train_number": "123", "delay_minutes": 10}]
    result = await reason_with_ai(anomalies)

    assert result == expected_response
    mock_generate_content.assert_called_once()

@pytest.mark.asyncio
@patch("backend.services.ai_service.client.aio.models.generate_content", new_callable=AsyncMock)
async def test_reason_with_ai_fallback_json_error(mock_generate_content):
    mock_response = MagicMock()
    mock_response.text = "Invalid JSON string"
    mock_generate_content.return_value = mock_response

    anomalies = [{"train_name": "Test Train", "train_number": "123", "delay_minutes": 10}]
    result = await reason_with_ai(anomalies)

    assert "incident_title" in result
    assert result["incident_title"] == "123 Test Train delayed 10min at Unknown Station"

@pytest.mark.asyncio
@patch("backend.services.ai_service.client.aio.models.generate_content", new_callable=AsyncMock)
async def test_reason_with_ai_fallback_exception(mock_generate_content):
    mock_generate_content.side_effect = Exception("API Error")

    anomalies = [{"train_name": "Test Train", "train_number": "123", "delay_minutes": 10}]
    result = await reason_with_ai(anomalies)

    assert "incident_title" in result
    assert result["incident_title"] == "123 Test Train delayed 10min at Unknown Station"
