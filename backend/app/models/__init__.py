# Import all models here so Alembic autogenerate can see them.
from app.models.import_doc import ClusterName, DocumentImport, TrendNote
from app.models.innovation import InnovationCard
from app.models.item import Item
from app.models.ticket import AiUsage, AppSetting, Notification, ThreadMessage, Ticket

__all__ = [
    "AiUsage",
    "AppSetting",
    "ClusterName",
    "DocumentImport",
    "InnovationCard",
    "Item",
    "Notification",
    "ThreadMessage",
    "Ticket",
    "TrendNote",
]
