import pytest
from unittest.mock import patch, MagicMock, AsyncMock
from backend.services.db_client import FallbackDB

@pytest.mark.asyncio
async def test_insert_incident_fallback():
    # Arrange
    db_client = FallbackDB()
    db_client.use_fallback = False

    # Mock self.db["incidents"].insert_one to raise an exception
    db_client.db = MagicMock()
    db_client.db["incidents"].insert_one = AsyncMock(side_effect=Exception("MongoDB offline"))

    # Mock _read_fallback and _write_fallback
    mock_data = {"incidents": [], "department_tasks": []}
    with patch.object(db_client, '_read_fallback', return_value=mock_data) as mock_read:
        with patch.object(db_client, '_write_fallback') as mock_write:
            incident = {"incident_id": "INC-123", "description": "Test incident"}

            # Act
            await db_client.insert_incident(incident)

            # Assert
            # Fallback should be enabled
            assert db_client.use_fallback is True

            # Read fallback should be called
            mock_read.assert_called_once()

            # Write fallback should be called with updated data
            mock_write.assert_called_once()
            args, _ = mock_write.call_args
            written_data = args[0]
            assert len(written_data["incidents"]) == 1
            assert written_data["incidents"][0]["incident_id"] == "INC-123"
            assert written_data["incidents"][0]["_id"] == "INC-123"

@pytest.mark.asyncio
async def test_insert_incident_fallback_already_active():
    # Arrange
    db_client = FallbackDB()
    db_client.use_fallback = True

    # Mock _read_fallback and _write_fallback
    mock_data = {"incidents": [], "department_tasks": []}
    with patch.object(db_client, '_read_fallback', return_value=mock_data) as mock_read:
        with patch.object(db_client, '_write_fallback') as mock_write:
            incident = {"incident_id": "INC-456", "description": "Test incident 2"}

            # Act
            await db_client.insert_incident(incident)

            # Assert
            # Fallback should remain enabled
            assert db_client.use_fallback is True

            # Read fallback should be called
            mock_read.assert_called_once()

            # Write fallback should be called
            mock_write.assert_called_once()
            args, _ = mock_write.call_args
            written_data = args[0]
            assert len(written_data["incidents"]) == 1
            assert written_data["incidents"][0]["incident_id"] == "INC-456"
