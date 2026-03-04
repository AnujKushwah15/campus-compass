#!/bin/bash
set -e

echo "1. Stopping and removing existing services..."
sudo systemctl stop camstream.service sensor_service.service || true
sudo systemctl disable camstream.service sensor_service.service || true
sudo rm -f /etc/systemd/system/camstream.service /etc/systemd/system/sensor_service.service
sudo systemctl daemon-reload

echo "2. Cloning the repository..."
cd /home/pi1
rm -rf campus-compass
git clone git@github.com:AnujKushwah15/campus-compass.git
cd campus-compass
# Try to checkout anuj branch, fallback to main if it fails
git checkout anuj || git checkout main

echo "3. Setting up services..."
# Make sure the py scripts are executable
chmod +x backend/pi/camstream.py || true
chmod +x backend/pi/sensor_service.py || true

cd /home/pi1/campus-compass
# Update paths in service files if they point to /home/pi instead of /home/pi1
sed -i 's|/home/pi/|/home/pi1/|g' backend/pi/camstream.service
sed -i 's|/home/pi/|/home/pi1/|g' backend/pi/sensor_service.service

# Fix User=pi → User=pi1 (the Pi user account is pi1, not the default pi)
sed -i 's|^User=pi$|User=pi1|' backend/pi/camstream.service
sed -i 's|^User=pi$|User=pi1|' backend/pi/sensor_service.service

# Fix /opt/campus-compass paths → actual install path
sed -i 's|WorkingDirectory=/opt/campus-compass/pi|WorkingDirectory=/home/pi1/campus-compass/backend/pi|g' backend/pi/sensor_service.service
sed -i 's|ExecStart=/opt/campus-compass/venv/bin/python3|ExecStart=/home/pi1/campus-compass/backend/pi/venv/bin/python3|g' backend/pi/sensor_service.service

sudo cp backend/pi/camstream.service /etc/systemd/system/
sudo cp backend/pi/sensor_service.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable camstream.service sensor_service.service
sudo systemctl start camstream.service sensor_service.service

echo "4. Creating auto-updater script..."
cat << 'EOF' > /home/pi1/update_campus_compass.sh
#!/bin/bash
cd /home/pi1/campus-compass

# Check current branch
BRANCH=$(git rev-parse --abbrev-ref HEAD)

# Fetch changes
git fetch origin $BRANCH

# Check if there are changes in the backend/pi/ directory
LOCAL_COMMIT=$(git rev-parse HEAD)
REMOTE_COMMIT=$(git rev-parse origin/$BRANCH)

if [ "$LOCAL_COMMIT" != "$REMOTE_COMMIT" ]; then
    CHANGES=$(git diff --name-only HEAD origin/$BRANCH | grep "^backend/pi/" || true)
    
    git merge origin/$BRANCH
    
    if [ -n "$CHANGES" ]; then
        echo "$(date): Changes detected in backend/pi/. Restarting services..."
        
        # update paths dynamically in case service files were pulled fresh
        sed -i 's|/home/pi/|/home/pi1/|g' backend/pi/camstream.service
        sed -i 's|/home/pi/|/home/pi1/|g' backend/pi/sensor_service.service
        
        sudo cp backend/pi/camstream.service /etc/systemd/system/
        sudo cp backend/pi/sensor_service.service /etc/systemd/system/
        sudo systemctl daemon-reload
        
        sudo systemctl restart camstream.service
        sudo systemctl restart sensor_service.service
    else
        echo "$(date): Pulled latest code. No changes in backend/pi/."
    fi
else
    echo "$(date): Already up to date."
fi
EOF

chmod +x /home/pi1/update_campus_compass.sh

echo "5. Setting up cron job..."
# Remove any existing cron entry for this script
(crontab -l 2>/dev/null | grep -v "update_campus_compass") | crontab -
# Add the new cron entry (runs every 5 minutes)
(crontab -l 2>/dev/null; echo "*/5 * * * * /home/pi1/update_campus_compass.sh >> /home/pi1/update_campus_compass.log 2>&1") | crontab -

echo "Setup complete! Services started and cron job installed."
