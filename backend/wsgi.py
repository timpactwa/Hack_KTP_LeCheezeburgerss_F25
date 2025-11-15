"""Production WSGI entry point that will import ``create_app`` from
``backend.app``.

Gunicorn/uwsgi servers will point here so they can lazily instantiate the same
Flask app used locally by ``flask run`` and consumed by the React frontend."""
