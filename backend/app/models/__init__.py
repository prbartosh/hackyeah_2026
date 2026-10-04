# Import all models here so Alembic autogenerate can see them.
from app.models.import_doc import ClusterName, DocumentImport, TrendNote
from app.models.innovation import InnovationCard
from app.models.item import Item
from app.models.kreator import Canva, Fiszka, Nabor, SzablonCanvy, Wniosek
from app.models.mentor import Mentor
from app.models.need import Potrzeba
from app.models.opinion import Opinia
from app.models.partnership import PartnershipMessage, PartnershipOffer
from app.models.ticket import AppSetting, Notification, ThreadMessage, Ticket

__all__ = [
    "AppSetting",
    "Canva",
    "ClusterName",
    "DocumentImport",
    "Fiszka",
    "InnovationCard",
    "Item",
    "Mentor",
    "Nabor",
    "Notification",
    "Opinia",
    "PartnershipMessage",
    "PartnershipOffer",
    "Potrzeba",
    "SzablonCanvy",
    "ThreadMessage",
    "Ticket",
    "TrendNote",
    "Wniosek",
]
