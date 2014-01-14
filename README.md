# CloudFract

A [fractal](https://www.google.com/search?q=fractal&tbm=isch) generating system built for the cloud.

# Overview

The project was initially conceived as a fun way to demonstrate the characteristics of a modern cloud-based application. The system consists of loosely coupled, stateless components that interact through a message-oriented middleware.

# Components

The components for the system are written in JavaScript, utilizing Node.js as the primary back-end technology.

## API Service

fract-api

Provides a RESTful client interface into the system.

## Fractal Generation Service

fract-generator

This component generates fractal images upon request. The current implementation uses [Mandelbulber](http://www.mandelbulber.com/) to generate the fractal images. The goal is to create additional generator worker node types that can generate fractals from similar utilities.

## Registry Service

fract-registry

This component provides an abstraction layer to the back-end data store that houses the fractal metadata. The current implementation uses [CouchDB](http://couchdb.apache.org/) to store metadata. The goal is to create additional registry worker node types that can manage meta-data using alternate storage technologies.

## Object Storage Service

fract-store

This component provides an abstraction layer to the back-end object store that houses the fractal image data. The current implementation uses [Swift](https://wiki.openstack.org/wiki/Swift) to store image data. The goal is to create additional storage worker node types that can manage image data using alternate storage technologies.

Note: This component is not implemented yet. Currently, the fract-generator component is persisting the image data through the registry service.

# Development

Development for cloudfract is done using Vagrant.

### Environment Setup

The first step is to configure vagrant.

    $ export VAGRANT_CWD=`pwd`/vagrant
    $ vagrant plugin install vagrant-vbguest

Fire up the vagrant node.

    $ vagrant up

Deploy the application dependencies and reload the vagrant node when complete.

    $ cd playbooks
    $ ansible-playbook site.yml
    $ vagrant reload

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
