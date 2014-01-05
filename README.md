# cloudfract

A fractal generating system built for the cloud.

# Overview

The project is intended to demonstrate the characteristics of a modern cloud-based application.

# Components

## API Service (fract-api)

Provides public-facing client interface for the system.

## Fractal Generation Service (fract-generator)

Generates fractal images.

## Fractal Registry Service (fract-registry)

Manages fractal metadata.

## Fractal Object Storage Service  (fract-store)

Stores fractal images in the backend object store.

# Development

Development for cloudfract is done using Vagrant.

### Environment Setup

The first step is to configure the vagrant.

    $ export VAGRANT_CWD=`pwd`/vagrant
    $ vagrant plugin install vagrant-vbguest

Fire up the vagrant node.

    $ vagrant up

Connect to the vagrant node.

    $ vagrant ssh

Once connected to the vagrant node, navigate to the source directory and list the contents using the `cll` alias.

    $ cd /srv/cloudfract
    $ cll

Modify the source files using the editor of your choice locally and quickly verify the changes in the vagrant node.

### fract-api

Navigate to the `api` directory, install the dependencies, then run the application.

    $ cd api
    $ npm install
    $ nodejs server

### fract-generator

Navigate to the `generator` directory, install the dependencies, then run the application.

    $ cd generator
    $ npm install
    $ nodejs server

### fract-registry

Navigate to the `registry` directory, install the dependencies, then run the application.

    $ cd registry
    $ npm install
    $ nodejs server
    
### fract-store

Navigate to the `store` directory, install the dependencies, then run the application.

    $ cd store
    $ npm install
    $ nodejs server
