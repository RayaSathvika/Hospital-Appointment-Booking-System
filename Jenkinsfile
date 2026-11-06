pipeline {
    agent any

    stages {
        stage('Checkout') {
            steps {
                checkout scm
                echo 'GitHub source code checked out successfully.'
            }
        }

        stage('Verify Project') {
            steps {
                bat 'dir'
                echo 'Hospital Appointment Booking System source verified.'
            }
        }
    }
}