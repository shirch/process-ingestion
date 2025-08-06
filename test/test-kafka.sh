#!/bin/bash

echo "Testing Kafka Process Ingestion Service"
echo "=========================================="

echo "Sending PS Command to Kafka:"
docker exec kafka bash -c "echo '{\"timestamp\": \"2025-08-05T06:30:00Z\", \"machine_name\": \"ubuntu-dev-01\", \"machine_id\": \"machine-001\", \"os_type\": \"ubuntu\", \"os_version\": \"Ubuntu 22.04.3 LTS\", \"command\": \"ps\", \"output\": \"USER PID %CPU %MEM VSZ RSS TTY STAT START TIME COMMAND\\nroot 1 0.9 0.2 168332 11564 ? Ss 01:10 0:01 /sbin/init splash\\nroot 2 0.0 0.0 0 0 ? S 01:10 0:00 [kthreadd]\\nroot 1234 0.5 1.2 150000 25000 pts/0 R+ 01:15 0:05 node server.js\"}' | /opt/kafka_2.13-2.8.1/bin/kafka-console-producer.sh --broker-list localhost:9092 --topic process-commands"

echo "PS message sent to Kafka!"
echo -e "\n"

echo "Sending TASKLIST Command to Kafka:"
docker exec kafka bash -c "echo '{\"timestamp\": \"2025-08-05T06:35:00Z\", \"machine_name\": \"windows-dev-01\", \"machine_id\": \"machine-002\", \"os_type\": \"windows\", \"os_version\": \"Windows 11 Pro\", \"command\": \"tasklist\", \"output\": \" Image Name PID Session Name Session# Mem Usage\\n ========================= ======== ================ =========== ============\\n System Idle Process 0 Services 0 24 K\\n System 4 Services 0 43,064 K\\n smss.exe 400 Services 0 1,548 K\\n csrss.exe 564 Services 0 6,144 K\"}' | /opt/kafka_2.13-2.8.1/bin/kafka-console-producer.sh --broker-list localhost:9092 --topic process-commands"

echo "TASKLIST message sent to Kafka!"
echo -e "\n"

echo "Waiting for messages to be processed..."
sleep 5

echo "✅ Test completed!"

