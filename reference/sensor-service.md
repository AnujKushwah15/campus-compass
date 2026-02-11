# Raspberry Pi Setup & Run Guide (Campus Compass Pi)

## 1️⃣ Boot Pi & Connect via SSH (From Windows)

``` powershell
ssh pi1@192.168.50.158
```

------------------------------------------------------------------------

## 2️⃣ Navigate to Project Directory

``` bash
cd ~/campus-compass-pi/pi
```

------------------------------------------------------------------------

## 3️⃣ Update System (First Time Only)

``` bash
sudo apt update
sudo apt upgrade -y
```

------------------------------------------------------------------------

## 4️⃣ Install Python & venv (First Time Only)

``` bash
sudo apt install python3 python3-pip python3-venv -y
```

------------------------------------------------------------------------

## 5️⃣ Create Virtual Environment (First Time Only)

``` bash
cd ~/campus-compass-pi
python3 -m venv venv
```

------------------------------------------------------------------------

## 6️⃣ Activate Virtual Environment

``` bash
source venv/bin/activate
```

You should now see:

    (venv) pi1@pi:~

------------------------------------------------------------------------

## 7️⃣ Install Python Dependencies

``` bash
cd ~/campus-compass-pi/pi
pip install -r requirements.txt
```

------------------------------------------------------------------------

## 8️⃣ Verify Required Files Exist

``` bash
ls
```

Make sure you see:

    requirements.txt
    sensor_service.py
    service-account.json

------------------------------------------------------------------------

## 9️⃣ Run the Python Script

### Without GPS:

``` bash
GPS_ENABLED=false python3 sensor_service.py
```

### With GPS:

``` bash
GPS_ENABLED=true python3 sensor_service.py
```

------------------------------------------------------------------------

## 🔁 Every Time After Reboot

``` bash
ssh pi1@192.168.50.158
cd ~/campus-compass-pi
source venv/bin/activate
cd pi
GPS_ENABLED=false python3 sensor_service.py
```

------------------------------------------------------------------------

## 🛑 Exit Virtual Environment

``` bash
deactivate
```
