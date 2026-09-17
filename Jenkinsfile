pipeline {
  agent any

  stages {
    stage('Install') {
      steps {
        dir('backend') {
          sh 'npm ci'
        }
      }
    }

    stage('Syntax Check') {
      steps {
        dir('backend') {
          sh 'node --check src/server.js'
        }
      }
    }

    stage('Test') {
      steps {
        dir('backend') {
          sh 'npm test'
        }
      }
    }
  }
}
