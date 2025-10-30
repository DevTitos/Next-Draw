#!/usr/bin/env bash
# build.sh

set -o errexit

pip install -r requirements.txt

python manage.py collectstatic --noinput
python manage.py migrate
python manage.py create_initial_data --players 10 --ventures 5
python manage.py process_ventures