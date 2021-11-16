/**
 * Imports
 */

import "./style.css";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import * as dat from "dat.gui";
import { PointLight, AmbientLight, Vector3 } from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { RoughnessMipmapper } from "three/examples/jsm/utils/RoughnessMipmapper.js";
import { Text } from "troika-three-text";
import * as R from "ramda";

fetch("./letters_json_grouped_merged.json")
  // log response to see whether data is loaded
  /* .then(response => {
      console.log('Response:', response)
      return response.json(); } */
  .then((response) => response.json())
  .then((data) => {
    console.log(data);
    return data;
  })
  .then((data) => {
    /**
     * Settings
     */

    const SETTINGS = {
      render_wireframe: false,
      show_edges: false,
    };

    /**
     * Sizes
     */

    // Anpassung an Größe des Browsers
    const sizes = {
      width: window.innerWidth,
      height: window.innerHeight,
    };

    /**
     * Canvas
     */

    // looks up canvas element in html where 3D graphic should be drawn
    const canvas = document.querySelector("canvas.webgl");

    /**
     * Renderer
     */

    const renderer = new THREE.WebGLRenderer({
      canvas: canvas,
      // makes background transparent
      alpha: true,
    });
    renderer.setSize(sizes.width, sizes.height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    /**
     * Scene
     */
    const scene = new THREE.Scene();

    /**
     * Variables
     */
    const targets = { table: [], sphere: [], helix: [], clickable: [] };

    /**
     * Data and Main Functions
     */

    /* CLEAR */
    function clearCanvas() {
      // ToDo
    }

    /* INIT */
    function init() {
      // default
      // später: Kugelansicht als default, dann wird hier mapViewKugeln() aufgerufen
      //(Funktion mapViewSpheres wird bei Klick auf "Spheres"-Button aufgerufen)
      mapViewKugeln();
      //mapViewSpheres();
    }
    init();

    /* CREATE MAP VIEWS */

    /* 1) Default: Kugelansicht */
    // Karte laden, dann Aufruf von makeKugeln()
    function mapViewKugeln() {
      const roughnessMipmapper = new RoughnessMipmapper(renderer);
      // load gltf basemap
      const loader = new GLTFLoader();
      loader.load("/gltf/goethe_basemap.glb", function (gltf) {
        gltf.scene.traverse(function (child) {
          // travese goes through all the children of an object
          if (child.isMesh) {
            roughnessMipmapper.generateMipmaps(child.material); // apply mipmapper before rendering
          }
        });

        // add basemap to scene (!gltf has its own scene)
        scene.add(gltf.scene);

        // debug: log scene graph
        console.log(scene);

        // add year marker
        scene.children
          .filter((i) => i.name == "Scene")[0] // scene contains another group "scene" which contains all objects in the gltf file created in blender (Karte und Ortsmarker)
          .children.filter(
            (i) => ["Frankfurt", "Darmstadt", "Wiesbaden"].includes(i.name) // temporary! filters which objects (Ortsmarker) from the scene group should be included
          )
          .forEach((placeMarker) => {
            // loop over Ortsmarker objects
            try {
              const city = data[placeMarker.name]; // saves name of place from json data
              console.log(city, placeMarker.name); // logs city names

              makeKugeln(placeMarker, city);
            } catch (error) {
              console.log(error);
            }
          });

        roughnessMipmapper.dispose();
        //render();
      });
    }

    /* 2) Briefnetz-Ansicht */

    function mapViewLetterNetwork() {
      // Code
      // Karte laden
      // Aufruf von makeLetterNetwork()
    }

    /* 3) Sphären-Ansicht*/

    // vector to which the planes will be facing
    const vector = new Vector3();

    function mapViewSpheres() {
      const roughnessMipmapper = new RoughnessMipmapper(renderer);
      // load gltf basemap
      const loader = new GLTFLoader();
      loader.load("/gltf/goethe_basemap.glb", function (gltf) {
        gltf.scene.traverse(function (child) {
          // travese goes through all the children of an object
          if (child.isMesh) {
            roughnessMipmapper.generateMipmaps(child.material); // apply mipmapper before rendering
          }
        });

        // add basemap to scene (!gltf has its own scene)
        scene.add(gltf.scene);

        // debug: log scene graph
        console.log(scene);

        scene.children
          .filter((i) => i.name == "Scene")[0] // scene contains another group "scene" which contains all objects in the gltf file created in blender (Karte und Ortsmarker)
          .children.filter(
            (i) => ["Frankfurt", "Darmstadt", "Wiesbaden"].includes(i.name) // temporary! filters which objects (Ortsmarker) from the scene group should be included
          )
          .forEach((placeMarker) => {
            // loop over Ortsmarker objects
            try {
              const city = data[placeMarker.name]; // saves name of place from json data
              console.log(city, placeMarker.name); // logs city names
              // Array with years (will later be provided by jQuery time filter)
              [
                "1764",
                "1765",
                "1766",
                "1767",
                "1768",
                "1769",
                "1770",
                "1771",
                "1772",
              ].forEach((year, index) => {
                let yearsOfCity = Object.keys(city); // save years associated to each city in an Array

                // test: little spheres in middle instead of text with year
                //let s = sphere(0.1);
                //s.position.y += 1 + index * 2.5;

                // create text object
                const yearMarker = new Text();
                yearMarker.name = `yearMarker${year}`;

                // Set content of text object (property "text")
                yearMarker.text = year;

                // Set styling properties of text object
                yearMarker.fontSize = 0.2;
                yearMarker.color = 0x9966ff;

                // Set position of text object
                // distance of text objects to next text object above
                yearMarker.position.y += 1 + index * 2.5;

                // Update the rendering:
                yearMarker.sync();

                // add yearMarker object as child of placeMarker object -> yearMarker positioned relative to placeMarker
                placeMarker.add(yearMarker);

                // test whether years in the time filter array (year) are contained in the list of years associated to each city
                // if yes, plot the letter objects (here: as sphere)
                // yearMarker = pivot, city[year] = data = array with all letter objects associated to this year
                if (yearsOfCity.includes(year)) {
                  let lettersFromYear = city[year];
                  makeSpheresForMap(yearMarker, lettersFromYear);
                }

                // add yearMarkers to array of clickable objects
                targets.clickable.push(yearMarker);
              });
            } catch (error) {
              console.log(error);
            }
          });

        roughnessMipmapper.dispose();
        //render();
      });
    }

    /* 4) Helix-Ansicht */
    function mapViewHelix() {
      // Code
      // Karte laden
      // Aufruf von makeHelixForMap()
    }

    /* FUNCTIONS FOR MAP VIEW */

    /* 1) Kugeln */
    // wird in init aufgerufen
    function makeKugeln(placeMarker, city) {
      // erhält übergeben: Ortsobjekt
      // Iteration über Jahre, dann Objekten in Jahren
      // Anzahl der Objekte ermitteln
      let letterCount = 0;
      Object.keys(city).forEach((year) => {
        let yearArray = city[`${year}`];
        // loop over array with letter objects
        for (let i = 0; i < yearArray.length; i++) {
          letterCount++;
        }
      });
      console.log(letterCount);

      // Anzahl der Objekte als Textobjekt
      const letterNumMarker = new Text();
      letterNumMarker.name = `letterNumMarker${letterCount}`;

      // Set content of text object
      letterNumMarker.text = letterCount;

      // Set styling properties of text object
      letterNumMarker.fontSize = 0.7;
      letterNumMarker.color = 0xFFFFFF;

      // Update the rendering:
      letterNumMarker.sync();

      // mithilfe des Interpolators den Durchmesser der Kugel ermitteln
      // Kugel mit three.js erstellen
      const geometryKugel = new THREE.SphereGeometry(1, 32, 16);
      const materialKugel = new THREE.MeshBasicMaterial({
        color: 0xcc0000,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.7,
      });
      const kugel = new THREE.Mesh(geometryKugel, materialKugel);
      // Kugel auf Karte platzieren
      placeMarker.add(kugel);
      // Kugel positionieren
      kugel.position.y = 2;
      // Text auf Kugel
      kugel.add(letterNumMarker);
    }

    function getMaxLettersPerPlace() {
      // iteration über Orte, Anzahl der Briefe zählen, in Array schreiben, dann max()
    }

    function getMinLettersPerPlace() {}

    /*     const scale = d3
      .scaleSequential()
      .domain([0, 400])
      .interpolator(d3.interpolate(1, 20));
    //undefined
    scale(355);
    // 17.8625 */

    /* 2) Briefnetz */

    /* 3) Sphären */
    // wird bei Klick auf Button Sphäre ausgeführt
    // Plots a sphere around each pivot point (year)
    // i = index position, l = length of dataset, pivot = point around which sphere will be centered
    function makeSpheresForMap(pivot, letters) {
      for (let i = 0, l = letters.length; i < l; i++) {
        // for later: filtering options
        /* if (data[i].receiverGender == "Weiblich") {
      element.style.backgroundColor = "rgb(237, 125, 49, 0.5)";
    } else if (data[i].receiverGender == "Männlich") {
      element.style.backgroundColor = "rgb(231, 230, 230, 0.5)";
    } else {
      element.style.backgroundColor = "rgb(0, 0, 0, 0.5)";
    } */

        /* 
        create planes and position them as a sphere 
      */

        // Mesh/Plane for letter objects
        const geometry = new THREE.PlaneGeometry(0.3, 0.3);
        // DoubleSide -> visisble and not visible sides of objects are rendered
        const material = new THREE.MeshBasicMaterial({
          color: 0xcc0000,
          side: THREE.DoubleSide,
          transparent: true,
          opacity: 0.7,
        });
        const plane = new THREE.Mesh(geometry, material);

        // set id for naming the plane (z.B. GB01_1_EB005_0_s)
        const id = letters[i].id;
        plane.name = `${id}`;

        // positioning of planes
        const phi = Math.acos(-1 + (2 * i) / l);
        const theta = Math.sqrt(l * Math.PI) * phi;

        plane.position.setFromSphericalCoords(1, phi, theta);

        // makes planes curve so they form a sphere by defining a vector which the planes should face
        vector.copy(plane.position).multiplyScalar(2);
        plane.lookAt(vector);

        // add letter objects to pivot bc their position is relative to the pivot
        pivot.add(plane);

        // add planes to array of clickable objects
        targets.clickable.push(plane);

        // axes helper for plane
        /* const axesHelperPlane = new THREE.AxesHelper( 1 );
      plane.add( axesHelperPlane ); */

        /* 
          create text objects with content to put on planes: id, initials, name, date
        */

        /* ID */
        const idText = new Text();

        // Set content of text object (property "text")
        idText.text = letters[i].idFormatted;

        // give object a name (will appear in scenegraph in console)
        // e.g. name="GB01 Nr.EB005"
        idText.name = `${letters[i].idFormatted}`;

        // Set styling properties of text object
        idText.fontSize = 0.03;
        idText.color = 0xffffff;

        // Update the rendering:
        idText.sync();

        /* INITIALS */
        const initialsText = new Text();
        // Scenegraph in Console: e.g. name="CB"
        initialsText.name = `initials_${letters[i].receiverInitials}`;

        // Set content of text object (property "text")
        initialsText.text = letters[i].receiverInitials;

        // Set styling properties of text object
        initialsText.fontSize = 0.08;
        initialsText.color = 0xffffff;

        // Update the rendering:
        initialsText.sync();

        /* NAME */
        const firstNameText = new Text();
        // Scenegraph in Console: e.g. name="Charlotte"
        firstNameText.name = `name_${letters[i].receiverFirstName}`;

        // Set content of text object (property "text")
        firstNameText.text = letters[i].receiverFirstName;

        // Set styling properties of text object
        firstNameText.fontSize = 0.02;
        firstNameText.color = 0xffffff;

        // Update the rendering:
        firstNameText.sync();

        const lastNameText = new Text();
        // Scenegraph in Console: e.g. name="Buff"
        lastNameText.name = `name_${letters[i].receiverLastName}`;

        // Set content of text object (property "text")
        lastNameText.text = letters[i].receiverLastName;

        // Set styling properties of text object
        lastNameText.fontSize = 0.02;
        lastNameText.color = 0xffffff;

        // Update the rendering:
        lastNameText.sync();

        /* DATE */
        const dateText = new Text();
        // Scenegraph in Console: e.g. name="12. Juli 1764"
        dateText.name = `${letters[i].dateFormatted}`;

        // Set content of text object (property "text")
        dateText.text = letters[i].dateFormatted;

        // Set styling properties of text object
        dateText.fontSize = 0.03;
        dateText.color = 0xffffff;

        // Update the rendering:
        dateText.sync();

        /* 
        add content to plane 
      */
        plane.add(idText);
        plane.add(initialsText);
        plane.add(firstNameText);
        plane.add(lastNameText);
        plane.add(dateText);

        /* 
        make content clickable
      */
        targets.clickable.push(initialsText);
        targets.clickable.push(firstNameText);
        targets.clickable.push(lastNameText);
        targets.clickable.push(idText);

        /* 
        position content on plane
      */

        /* ID */
        idText.position.y = 0.13;
        idText.position.x = -0.09;
        idText.position.z = 0.01;

        // axes helper for idText
        /* const axesHelperidText = new THREE.AxesHelper( 1 );
      idText.add( axesHelperidText ); */

        // gui helper for idText
        idTextGui
          .add(idText.position, "y")
          .min(-10)
          .max(10)
          .step(0.01)
          .name(`y_${idText.name}`);
        idTextGui
          .add(idText.position, "x")
          .min(-10)
          .max(10)
          .step(0.01)
          .name(`x_${idText.name}`);
        idTextGui
          .add(idText.position, "z")
          .min(-10)
          .max(10)
          .step(0.01)
          .name(`z_${idText.name}`);

        /* INITIALS */
        initialsText.position.y = 0.07;
        initialsText.position.x = -0.06;
        initialsText.position.z = 0.01;

        // axes helper for initials
        /* const axesHelperInitials = new THREE.AxesHelper( 1 );
      initialsText.add( axesHelperInitials ); */

        // gui helper for initials
        initialsGui
          .add(initialsText.position, "y")
          .min(-10)
          .max(10)
          .step(0.01)
          .name(`y_${idText.name}`);
        initialsGui
          .add(initialsText.position, "x")
          .min(-10)
          .max(10)
          .step(0.01)
          .name(`x_${idText.name}`);
        initialsGui
          .add(initialsText.position, "z")
          .min(-10)
          .max(10)
          .step(0.01)
          .name(`z_${idText.name}`);

        /* NAME */
        firstNameText.position.y = -0.03;
        firstNameText.position.x = -0.13;
        firstNameText.position.z = 0.01;

        lastNameText.position.y = -0.06;
        lastNameText.position.x = -0.13;
        lastNameText.position.z = 0.01;

        // axes helper for name
        /* const axesHelperName = new THREE.AxesHelper( 1 );
  firstNameText.add( axesHelperName ); */

        /* const axesHelperName = new THREE.AxesHelper( 1 );
  lastNameText.add( axesHelperName ); */

        // gui helper for firstName
        firstNameGui
          .add(firstNameText.position, "y")
          .min(-10)
          .max(10)
          .step(0.01)
          .name(`y_${idText.name}`);
        firstNameGui
          .add(firstNameText.position, "x")
          .min(-10)
          .max(10)
          .step(0.01)
          .name(`x_${idText.name}`);
        firstNameGui
          .add(firstNameText.position, "z")
          .min(-10)
          .max(10)
          .step(0.01)
          .name(`z_${idText.name}`);

        // gui helper for lastName
        lastNameGui
          .add(lastNameText.position, "y")
          .min(-10)
          .max(10)
          .step(0.01)
          .name(`y_${idText.name}`);
        lastNameGui
          .add(lastNameText.position, "x")
          .min(-10)
          .max(10)
          .step(0.01)
          .name(`x_${idText.name}`);
        lastNameGui
          .add(lastNameText.position, "z")
          .min(-10)
          .max(10)
          .step(0.01)
          .name(`z_${idText.name}`);

        /* DATE */
        dateText.position.y = -0.09;
        dateText.position.x = -0.13;
        dateText.position.z = 0.01;

        // axes helper for name
        /* const axesHelperDate = new THREE.AxesHelper( 1 );
      dateText.add( axesHelperDate ); */

        // gui helper for name
        dateGui
          .add(dateText.position, "y")
          .min(-10)
          .max(10)
          .step(0.01)
          .name(`y_${idText.name}`);
        dateGui
          .add(dateText.position, "x")
          .min(-10)
          .max(10)
          .step(0.01)
          .name(`x_${idText.name}`);
        dateGui
          .add(dateText.position, "z")
          .min(-10)
          .max(10)
          .step(0.01)
          .name(`z_${idText.name}`);

        /* AXES HELPER for pivot */
        /* const axesHelperPivot = new THREE.AxesHelper( 1 );
        pivot.add( axesHelperPivot ); */

        // Text
        /* const myText = new Text();
        pivot.add(myText);
 */
        //

        // ???
        const object = new THREE.Object3D();
        // Objekte werden in das table Array des targets-Objekts aufgenommen
        targets.table.push(object);
      }
    }

    /* 4) Helix */
    // wird bei Klick auf Button Helix ausgeführt
    function makeHelixForMap() {}

    /* CREATE SINGLE PLACE VIEWS (Einzelansicht)*/

    function initSinglePlaceView() {
      // default: Sphären
      loadSingleViewBase();
      makeSpheresForSingleView();
    }

    function singlePlaceViewHelix() {
      loadSingleViewBase();
      makeHelixForSingleView();
    }

    /* FUNCTIONS FOR SINGLE PLACE VIEW */

    /* Basis für Einzelansicht */
    function loadSingleViewBase() {}

    /* Einzelansicht: Sphären */
    function makeSpheresForSingleView() {}

    /* Einzelansicht: Helix */
    function makeHelixForSingleView() {}

    /**
     * Helper Geometries
     */
    if (SETTINGS.show_edges) {
      const edges = new THREE.EdgesGeometry(geometry);
      const line = new THREE.LineSegments(
        edges,
        new THREE.LineBasicMaterial({ color: 0xffffff })
      );
      scene.add(line);
    }

    if (SETTINGS.render_wireframe) {
      const wireframe = new THREE.WireframeGeometry(geometry);
      const wire = new THREE.LineSegments(wireframe);
      wire.material.depthTest = false;
      wire.material.opacity = 0.75;
      wire.material.transparent = true;
      scene.add(wire);
    }

    /**
     * Axes Helper (Scene)
     */

    /* const axesHelperScene = new THREE.AxesHelper( 30 );
  scene.add( axesHelperScene ); */

    /**
     * Lights
     */

    // AmbientLight -> leuchtet alles gleichmäßig aus, kein Schatten
    const ambient_light = new THREE.AmbientLight(0x404040, 1.0);
    scene.add(ambient_light);

    // PointLight
    const pointLight = new THREE.PointLight(
      // Farbe
      0xffffff,
      // Intensität
      0.5
    );
    pointLight.position.x = -6.5;
    pointLight.position.y = 100;
    pointLight.position.z = 6;
    scene.add(pointLight);

    const pointLightColor = { color: 0xff0000 };

    /**
     * Helper geos for lights
     */

    // creates a geometric form that represents the light so you know where exactly the light is
    // there is a helper for every kind of light
    const pointLighthelper = new THREE.PointLightHelper(pointLight, 1);
    scene.add(pointLighthelper);
    //const pointLight2helper = new THREE.PointLightHelper(pointLight2, 1);
    //scene.add(pointLight2helper);

    /**
     * Resizing
     */

    window.addEventListener("resize", () => {
      // Update sizes
      sizes.width = window.innerWidth;
      sizes.height = window.innerHeight;

      // Update camera
      camera.aspect = sizes.width / sizes.height;
      camera.updateProjectionMatrix();

      // Update renderer
      renderer.setSize(sizes.width, sizes.height);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    });

    /**
     * Debug GUI
     */
    const gui = new dat.GUI();
    // must be wider than default, so that also long labels are visible e.g. "y_GB01 Nr.EB013"
    gui.width = 310;

    // Set GUI folders
    const light = gui.addFolder("Light");
    const idTextGui = gui.addFolder("idText");
    const initialsGui = gui.addFolder("initials");
    const firstNameGui = gui.addFolder("firstname");
    const lastNameGui = gui.addFolder("lastname");
    const dateGui = gui.addFolder("date");

    // Set Debug GUI
    light.add(pointLight.position, "y").min(-10).max(100).step(0.01);
    light.add(pointLight.position, "x").min(-10).max(10).step(0.01);
    light.add(pointLight.position, "z").min(-10).max(10).step(0.01);
    light.add(pointLight, "intensity").min(0).max(15).step(0.01);
    light.addColor(pointLightColor, "color").onChange(() => {
      pointLight.color.set(pointLightColor.color);
    });

    /**
     * Camera
     */

    const camera = new THREE.OrthographicCamera(
      sizes.width / -2,
      sizes.width / 2,
      sizes.height / 2,
      sizes.height / -2,
      0,
      2000
    );
    camera.position.x = 0;
    camera.position.y = 25;
    camera.position.z = 20;
    camera.zoom = 10;
    camera.updateProjectionMatrix();
    scene.add(camera);

    /**
     * Controls
     */

    const controls = new OrbitControls(camera, canvas);
    //controls.enableDamping = true;

    /**
     * Mouse interaction and Raycasting
     */

    // speichert Koordinaten der Maus
    const mousemove = {
      mouseX: 0,
      mouseY: 0,
      normalizedMouse: {
        x: 0,
        y: 0,
      },
      targetX: 0,
      targetY: 0,
      windowHalfX: window.innerWidth / 2,
      windowHalfY: window.innerHeight / 2,
    };

    // Hiermit werden die Mauskoordinaten je nach Position geupdated
    document.addEventListener("mousemove", (e) => {
      mousemove.mouseX = e.clientX - mousemove.windowHalfX;
      mousemove.mouseY = e.clientY - mousemove.windowHalfY;
      // der Raycaster benötigt ein normalisiertes Koordinatensystem auf Basis
      // der Bildschrimkoordinaten des Mauszeigers
      // der Raycaster wird innerhalb des Animations-Loops mit den jeweils aktuellen
      // Koordinaten neu gesetzt (siehe unten)
      // Teilen durch innerWidth und Multiplizieren mit 2-1 sorgt dafür, dass x und y Werte von -1 bis 1 annehmen können
      mousemove.normalizedMouse.x = (e.clientX / window.innerWidth) * 2 - 1;
      mousemove.normalizedMouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
    });

    // Raycast passiert nur bei Mausklick
    document.addEventListener("click", (e) => {
      // der Raycaster gibt ein Array mit den vom Strahl getroffenen
      // Objekten zurück. Dieses Array ist leer (Länge == 0), wenn
      // keine Objekte getroffen wurden.
      let intersects = raycaster.intersectObjects(targets.clickable);
      console.log(scene.children[4].children);
      // Alle Elemente in der Szene. Klick auf den LightHelper logged bspw. diesen.
      // Statt scene.children kann auch ein Array relevanter Objekte angegeben werden: [ objectPlanet ]
      // Wenn der intersects Array Objekte enthält (length > 0), dann wird der string "Klick" ausgegeben plus das Objekt

      if (intersects.length > 0) {
        // log clicks
        let clickedObj = intersects[0].object;
        console.log("Klick ", clickedObj);

        /* Define click events for different objects*/

        // click on letter object (planes)
        // nur zum Test
        if (clickedObj.geometry.type == "PlaneGeometry") {
          console.log("Briefelement angeklickt");
        }

        // click on id -> link to platform
        if (clickedObj.name.includes("GB01 Nr.")) {
          // öffnet neuen Tab mit Beispielbrief
          window.open("https://goethe-biographica.de/id/GB02_BR005_0");
          // perspektivisch (wenn Briefe auf Plattform verlinkt)
          // Lookup: Welcher Brief gehört zum Plane? evtl. BriefId als Name des Planes festlegen damit es funktioniert, dann property "propyURL" in window() einsetzen
          // maybe useful:
          // get id of letter (without _s or _r)
          /* let id = R.replace(/_[sr]/g, "", clickedObj.parent.name);
             console.log(id); */
        }

        // click on initals or name -> link to gnd of person
        if (
          clickedObj.name.includes("initials") ||
          clickedObj.name.includes("name")
        ) {
          let searchObj = {}; // will be object with id of the respective letter
          // loop over places
          Object.keys(data).forEach((place) => {
            // loop over years
            Object.keys(data[`${place}`]).forEach((year) => {
              let yearArray = data[`${place}`][`${year}`];
              // loop over array with letter objects
              for (let i = 0; i < yearArray.length; i++) {
                // test if id of current obj = name of parent obj in scene (i.e. id of plane)
                // if yes, save current obj in var searchObj and link to gnd
                if (yearArray[i].id == clickedObj.parent.name) {
                  searchObj = yearArray[i];
                  // use gnd url stored in property "receiverId" to open link in new tab
                  window.open(searchObj.receiverId);
                }
              }
            });
          });
        }
      } else {
        console.log("No intersections.");
      }
    });

    // Raycast-event bei gedrückt gehaltener Maustaste
    document.addEventListener("mousedown", (e) => {
      // der Raycaster gibt ein Array mit den vom Strahl getroffenen
      // Objekten zurück. Dieses Array ist leer (Länge == 0), wenn
      // keine Objekte getroffen wurden.
      let intersects = raycaster.intersectObjects(scene.children);

      if (intersects.length > 0) {
        //let planet = intersects[0].object;
        //console.log("Mousedown ", planet);
        // Skaliert die Größe des Objekts hoch
        //planet.scale.x = orig.x * 1.2;
        //planet.scale.y = orig.y * 1.2;
        //planet.scale.z = orig.z * 1.2;
      }
    });

    document.addEventListener("mouseup", (e) => {
      // Setzt die Größe des Planeten auf den Anfangswert
      // sobald die Maustaste nicht mehr gehalten wird
      //object.scale.x = orig.x;
      //object.scale.y = orig.y;
      //object.scale.z = orig.z;
    });

    // Instanziiert den Raycaster
    const raycaster = new THREE.Raycaster();

    const clock = new THREE.Clock();

    const tick = () => {
      mousemove.targetX = mousemove.mouseX * 0.001;
      mousemove.targetY = mousemove.mouseY * 0.001;

      const elapsedTime = clock.getElapsedTime();

      // Update objects
      /* object.rotation.y = 0.3 * elapsedTime;
  
    object.rotation.y += 0.5 * (mousemove.targetX - object.rotation.y);
    object.rotation.x += 0.5 * (mousemove.targetY - object.rotation.x);
    object.rotation.z += 0.005 * (mousemove.targetY - object.rotation.x); */
      // Update Orbital Controls
      //controls.update()

      // Raycaster
      // hier wird der Raycaster mit den jeweils aktuellen Mauskoordinaten
      // aktualisiert, so dass der Strahl von der korrekten Position
      // geschossen wird
      raycaster.setFromCamera(mousemove.normalizedMouse, camera);

      // Render
      renderer.render(scene, camera);

      // Call tick again on the next frame
      window.requestAnimationFrame(tick);
    };

    tick();
  }); // FETCH END
