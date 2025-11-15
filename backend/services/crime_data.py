"""Crime ingestion + transformation routines shared across the stack.

The real implementation will load files from ``data/raw``, cache processed
outputs in ``data/processed``, serve heatmap features to ``backend.routes.routes``
and supply avoid polygons to ``backend.services.routing`` + ``scripts``."""
