/**
 *  @fileOverview This js-file creates the single place view.
 *
 *  @author       Marina Lehmann
 *  @author       Max Grüntgens
 *
 *  @requires     NPM:three.js
 *  @requires     NPM:dat.gui
 *  @requires     NPM:ramda
 *  @requires     NPM:d3
 *  @requires     NPM:jQuery
 */

/*
 * Imports
 */

import "./style.css";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import * as dat from "dat.gui";
import { PointLight, AmbientLight, Vector3 } from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { RoughnessMipmapper } from "three/examples/jsm/utils/RoughnessMipmapper.js";
import * as R from "ramda";
import * as d3 from "d3";
import {
  CSS3DRenderer,
  CSS3DObject,
} from "three/examples/jsm/renderers/CSS3DRenderer.js";
import * as jQuery from "jquery/dist/jquery.min.js";

fetch("./letters_json_grouped_merged.json")
  // log response to see whether data is loaded
  /* .then(response => {
      console.log('Response:', response)
      return response.json(); } */
  .then((response) => response.json())
  .then((data) => {
    //console.log(data);
    return data;
  })
  .then((data) => {
    /*
     * Settings
     */
    const SETTINGS = {
      render_wireframe: false,
      show_edges: false,
    };

    /*
     * Sizes
     */

    // Anpassung an Größe des Browsers
    const sizes = {
      width: window.innerWidth,
      height: window.innerHeight,
    };

    /**
     * Renderer
     *
     * @desc This function creates the CSS3D renderer used by the single place view. The renderer uses the div with id="container" to display the rendered objects.
     * @function renderer
     * @returns THREE.CSS3DRenderer
     */
    let renderer = (() => {
      let renderer = new CSS3DRenderer();
      renderer.name = "CSS3D";
      renderer.setSize(window.innerWidth, 1000);
      // im div mit id = container werdend die Objekte gerendert
      document.getElementById("container").appendChild(renderer.domElement);
      return renderer;
    })();

    /*
     * Scene
     */
    const scene = new THREE.Scene();

    /*
     * Variables
     */
    const targets = { table: [], sphere: [], helix: [], clickable: [] };

    let timeFilterRange = range(1764, 1772);

    /* placename */
    // gets currrent url e.g. single.html#frankfurt
    let placename = window.location.hash.slice(1);
    //let placename = "Frankfurt";

    /**
     * Data and Main Functions
     */

    /**
     * Clear function
     * @desc This function disposes of the objects on the canvas by using the class ResourceTracker. It is called when changing between different versions of the map view (kugel, sphere, helix).
     * @function clearCanvas
     * @returns nothing
     */
    function clearCanvas() {
      //resourceTracker.logResources();
      resourceTracker.dispose();

      console.log("Disposed!");
      console.log(scene);
      console.log(renderer.info);
      //resourceTracker.logResources();
    }

    /**
     * ResourceTracker
     * @classdesc A class to track the objects which will be removed from the scene when views change.
     * @class ResourceTracker
     */
    class ResourceTracker {
      constructor() {
        this.resources = new Set();
      }

      /**
       * @desc Tracks objects, i.e. adds them to the resourceTracker Set. Belongs to class ResourceTracker.
       * @function track
       * @param {} resource Parameters can be all kinds of objects.
       * @returns resource
       */
      track(resource) {
        // check whether resource is undefined or null
        if (!resource) {
          return resource;
        }

        // handle children and handle other arrays, i.e. when material is an array of materials or
        // uniform is array of textures
        if (Array.isArray(resource)) {
          resource.forEach((resource) => this.track(resource));
          return resource;
        }

        // add recource to the tracking array
        if (resource.dispose || resource instanceof THREE.Object3D) {
          this.resources.add(resource);
        }

        // geometry, material and possible children of an Object3D must be tracked (and then disposed of) separately
        if (resource instanceof THREE.Object3D) {
          this.track(resource.geometry);
          this.track(resource.material);
          this.track(resource.children);
        } else if (resource instanceof THREE.Material) {
          // check if there are any textures on the material
          for (const value of Object.values(resource)) {
            if (value instanceof THREE.Texture) {
              this.track(value);
            }
          }
          // check if any uniforms reference textures or arrays of textures
          if (resource.uniforms) {
            for (const value of Object.values(resource.uniforms)) {
              if (value) {
                const uniformValue = value.value;
                if (
                  uniformValue instanceof THREE.Texture ||
                  Array.isArray(uniformValue)
                ) {
                  this.track(uniformValue);
                }
              }
            }
          }
        }
        return resource;
      }

      /**
       * @desc Untracks objects, i.e. removes them from the resourceTracker Set. Belongs to class ResourceTracker.
       * @function untrack
       * @param {} resource Parameters can be all kinds of objects.
       * @returns nothing
       */
      untrack(resource) {
        this.resources.delete(resource);
      }

      /**
       * @desc Deletes all tracked objects, i.e. empties the resourceTracker Set. Belongs to class ResourceTracker.
       * @function dispose
       * @returns nothing
       */
      dispose() {
        for (const resource of this.resources) {
          if (resource instanceof THREE.Object3D) {
            if (resource.parent) {
              resource.parent.remove(resource);
            }
          }
          if (resource.dispose) {
            resource.dispose();
          }
        }
        this.resources.clear();
      }
      logResources() {
        console.log(this.resources);
      }
    }

    // set up resource tracker and bind tracking method to track() (function can be used without referencing the class first)
    const resourceTracker = new ResourceTracker();
    const track = resourceTracker.track.bind(resourceTracker);

    /* CREATE SINGLE PLACE VIEWS (Einzelansicht)*/

    /* INIT: SPHERE */
    /**
     * @desc Initializes single place view by creating the default view: sphere.
     * @function initSinglePlaceView
     * @returns nothing
     */
    function initSinglePlaceView(placename, timeFilterRange) {
      // clear canvas
      clearCanvas();

      // set placename as heading
      setHeading(placename);

      // create spheres
      makeSpheresForSingleView(placename, timeFilterRange);

      // create infobox
      makeInfoBox();

      // log
      console.log("Wechsel zu Einzelansicht!");
    }
    initSinglePlaceView(placename, timeFilterRange);

    /* HELIX (todo) */
    function singlePlaceViewHelix(placename) {
      // clear canvas
      clearCanvas();

      // create helix
      makeHelixForSingleView(placename);
    }

    /* FUNCTIONS FOR SINGLE PLACE VIEW */

    /**
     * @function setHeading
     * @desc Set the name of the place as heading.
     * @param {string} placename name of place for which the single view is created
     * @returns nothing
     */
    function setHeading(placename) {
      const h1 = track(document.createElement("h1"));
      h1.textContent = placename;
      // prepend adds h1 as first element in body
      document.body.prepend(h1);
    }

    /**
     * @function makeSpheresForSingleView
     * @desc Creates spheres for single view. Calls createSphere for each year and makeYearMarker to create text objects as yearMarkers.
     * @param {string} placename name of place for which the single view is created
     * @param {string[]} timeFilterRange Year range set by the time filter
     * @returns return value
     */
    function makeSpheresForSingleView(placename, timeFilterRange) {
      // vector to which the planes will be facing
      const vector = new THREE.Vector3();

      // get data for place
      let place = data[`${placename}`];

      // loop over years, put letters from each year in an array and use it to create a sphere
      Object.keys(place).forEach((year, index) => {
        let yearArray = place[`${year}`];
        console.log(yearArray);
        // loop over array with letter objects
        let letters = [];
        if (timeFilterRange.includes(year)) {
          for (let i = 0; i < yearArray.length; i++) {
            letters.push(yearArray[i]);
          }
          createSphere(letters, index);
        }

        makeYearMarker(year, index);
      });

      /**
       * @function createSphere
       * @desc Makes spheres by createing a div structure. div "letter" is associated to a CSS3D Object which represents the letter planes in the single view. The children of this div are other divs which contain the textual inforamtion displayed on the letter object: id, initials, name, date.
       * @param {Object[]} letters Array of letter data objects
       * @param {number} yearIndex
       * @returns nothing
       */
      function createSphere(letters, yearIndex) {
        for (let i = 0, l = letters.length; i < l; i++) {
          // <div class="element">
          const letterElement = track(document.createElement("div"));
          letterElement.className = "letter";
          letterElement.dataset.gender = letters[i].receiverGender;

          letterElement.style.backgroundColor = "rgb(204, 0, 0, 0.5)";

          // <div class="id">
          const id = track(document.createElement("div"));
          id.className = "id";
          id.textContent = letters[i].idFormatted;
          // click on id leads to propy platform
          id.setAttribute(
            "onclick",
            "window.open(' " + letters[i].propyURL + "')"
          );
          letterElement.appendChild(id);

          // <div class="initials">
          const initials = track(document.createElement("div"));
          initials.className = "initials";
          initials.textContent = letters[i].receiverInitials;
          // click on initials leads to gnd entry of person
          initials.setAttribute(
            "onclick",
            "window.open(' " + letters[i].receiverId + "')"
          );
          letterElement.appendChild(initials);

          // <div class="name">
          const name = track(document.createElement("div"));
          name.className = "name";
          name.innerHTML = letters[i].receiverFormatted;
          // click on name leads to gnd entry of person
          name.setAttribute(
            "onclick",
            "window.open(' " + letters[i].receiverId + "')"
          );
          letterElement.appendChild(name);

          // <div class="date">
          const date = track(document.createElement("div"));
          date.className = "date";
          date.innerHTML = letters[i].dateFormatted;
          letterElement.appendChild(date);

          // creates CSS3DObject form variable letterElement
          const objectCSS = track(new CSS3DObject(letterElement));
          objectCSS.name = letters[i].id;

          // calculation of angles which are necessary for positioning objects in a spherical coordinate system
          // based on index and length ob object array
          // phi = polar angle in radians from the y (up) axis
          // theta = equator angle in radians around the y (up) axis
          const phi = Math.acos(-1 + (2 * i) / l);
          const theta = Math.sqrt(l * Math.PI) * phi;

          // object (element) is placed within a spherical coordinate system, i.e. is placed on a sphere
          // https://en.wikipedia.org/wiki/Spherical_coordinate_system
          // spcherical coordinate system in three.js: https://threejs.org/docs/index.html?q=vector#api/en/math/Spherical
          // parameter: radial distance from point to origin (Mittelpunkt), phi, theta
          objectCSS.position.setFromSphericalCoords(500, phi, theta);

          // position of object is saved in vector and scalar multiplied by 2
          vector.copy(objectCSS.position).multiplyScalar(2);

          // object and vector face each other
          // object is rotated so that its internal axis is facing the vector
          objectCSS.lookAt(vector);
          scene.add(objectCSS);

          objectCSS.position.y += 1200 * yearIndex;

          // object added to targets.sphere
          targets.sphere.push(objectCSS);
        }
      }
    }

    /* Einzelansicht: Helix (todo) */
    function makeHelixForSingleView() {}

    /* HELPER FUNCTIONS */

    /**
     * @function makeYearMarker
     * @desc Creates css3D objects as yearMarkers and corresponding div.
     * @param {string} year 
     * @returns nothing
     */
    function makeYearMarker(year, index) {
      const yearMarker = track(document.createElement("div"));
      yearMarker.className = "year";
      yearMarker.textContent = year;
      document.body.appendChild(yearMarker);

      const marker = track(new CSS3DObject(yearMarker));
      marker.name = "yearMarker";
      scene.add(marker);

      marker.position.y += 1200 * index;
    }

     /**
     * @function removeContentOfInfobox
     * @desc Removes children of infobox div, i.e. removes the content of the infobox. This function is needed whenever the infobox should be updated.
     * @returns nothing
     */
    function removeContentOfInfobox() {
      const parent = document.getElementById("infobox");

      // removes last child until there are no more children
      while (parent.lastChild) {
        parent.removeChild(parent.lastChild);
      }
    }

    /* Helper functions for Filter */

    /**
     * @function getCurrentLetterObjectsOnScene
     * @desc Goes through entire scene and makes an array of all the letter objects currently on the scene. Important: Not the curently visible objects. This function collects all the objects - visible and hidden.
     * @returns CSS3DObject[]
     */
    function getCurrentLetterObjectsOnScene() {
      let currentLetterObjectsOnScene = [];
      scene.children.forEach((child) => {
        if (child.name.startsWith("GB")) {
          currentLetterObjectsOnScene.push(child);
        }
      });
      //console.log("Letter Objects", currentLetterObjectsOnScene);
      return currentLetterObjectsOnScene;
    }

    /**
     * @function getCurrentlyVisibleLetterObjectsOnScene
     * @desc Goes through entire scene and makes an array of all the letter objects currently visible on the scene. Only the visible ones.
     * @returns CSS3DObject[]
     */
    function getCurrentlyVisibleLetterObjectsOnScene() {
      let currentlyVisibleLetterObjectsOnScene = [];
      scene.children.forEach((child) => {
        if (child.name.startsWith("GB") && child.visible == true) {
          currentlyVisibleLetterObjectsOnScene.push(child);
        }
      });
      //console.log("Letter Objects", currentLetterObjectsOnScene);
      return currentlyVisibleLetterObjectsOnScene;
    }

     /**
     * @function getIdsOfLetterObjects
     * @desc Takes an array of letter objects and returns all the ids associated to these objects.
     * @param {CSS3DObject[]} letterObjectsArray Array of letter objects
     * @returns string[]
     */
    function getIdsOfLetterObjects(letterObjectsArray) {
      let idsOfLetterObjects = [];
      letterObjectsArray.forEach((object) => {
        idsOfLetterObjects.push(object.name);
      });
      //console.log("Liste der Ids:");
      //console.log(idsOfCurrentLetterObjectsOnScene);
      return idsOfLetterObjects;
    }

    /**
     * @function getletterDataOfLetterObjects
     * @desc Takes an array of ids and gets all the letter data associated to these ids.
     * @param {string[]} idsOfLetters Array of ids
     * @returns Object.<string, string>
     */
    function getletterDataOfLetterObjects(idsOfLetterObjects) {
      let letterDataArray = [];

      // find letters currently in scene and put them into the array
      Object.values(data).forEach((place) => {
        Object.values(place).forEach((year) => {
          for (let i = 0; i < year.length; i++) {
            if (idsOfLetterObjects.includes(year[i].id)) {
              letterDataArray.push(year[i]);
              //console.log(lettersCurrentlyOnScene);
            }
          }
        });
      });

      return letterDataArray;
    }

    /**
     * @function changeLetterObjectColor
     * @desc Changes color of a given letter object.
     * @param {CSS3DObject[]} currentLetterObjectsOnScene Array of all letter objects currently on scene (visible and hidden)
     * @param {string} id Id of the letter object which should be recolored.
     * @param {color} color Color (rgb code)
     * @returns nothing
     */
    function changeLetterObjectColor(currentLetterObjectsOnScene, id, color) {
      // get letter object associated with the current id
      let currLetterObj = currentLetterObjectsOnScene.find(
        (letter) => letter.name == id
      );
      // change color of the letter object
      currLetterObj.element.style.backgroundColor = color;
    }

    /**
     * @function hideLetterObject
     * @desc Hides a given letter object.
     * @param {CSS3DObject[]} currentLetterObjectsOnScene Array of all letter objects currently on scene (visible and hidden)
     * @param {string} id Id of the letter object which should be hidden.
     * @returns nothing
     */
    function hideLetterObject(currentLetterObjectsOnScene, id) {
      // get letter object associated with the current id
      let currLetterObj = currentLetterObjectsOnScene.find(
        (letter) => letter.name == id
      );
      currLetterObj.visible = false;
    }

    /**
     * @function showLetterObject
     * @desc Shows a given letter object after it has been hidden.
     * @param {CSS3DObject[]} currentLetterObjectsOnScene Array of all letter objects currently on scene (visible and hidden)
     * @param {string} id Id of the letter object which should be shown.
     * @returns nothing
     */
    function showLetterObject(currentLetterObjectsOnScene, id) {
      // get letter object associated with the current id
      let currLetterObj = currentLetterObjectsOnScene.find(
        (letter) => letter.name == id
      );
      currLetterObj.visible = true;
    }

    /**
     * @function getCheckboxGenderState
     * @desc Checks whether the following checkboxes are checked: male, female, other. Creates an objects that contains the individual states but also a string of booleans representing the state of all these checkboxes: male-female-other. E.g. true-false-false = only male checkbox checked.
     * @param {type} paramName Parameter description.
     * @returns state object
     */
    function getCheckboxGenderState() {
      let state = {
        male: $(".male").is(":checked"),
        female: $(".female").is(":checked"),
        other: $(".other").is(":checked"),
        string: `${$(".male").is(":checked")}-${$(".female").is(
          ":checked"
        )}-${$(".other").is(":checked")}`,
      };
      return state;
    }

    /**
     * @function genderFilter
     * @desc Implements the functionalities of the gender filter. Chooses the functionality based on the state of the three gender checkboxes.
     * @returns nothing
     */
    function genderFilter() {
      let state = getCheckboxGenderState();

      if ($(".filter").is(":checked")) {
        let currentLetterObjectsOnScene = getCurrentLetterObjectsOnScene();
        // get array of all the ids of the letter objects
        let idsOfCurrentLetterObjectsOnScene = getIdsOfLetterObjects(
          currentLetterObjectsOnScene
        );

        let lettersCurrentlyOnScene = getletterDataOfLetterObjects(
          idsOfCurrentLetterObjectsOnScene
        );
        console.log("letter objects", currentLetterObjectsOnScene);

        switch (state.string) {
          // male-female-other
          // alles gecheckt
          case "true-true-true":
            // shows objects if hidden
            for (let i = 0; i < currentLetterObjectsOnScene.length; i++) {
              if (currentLetterObjectsOnScene[i].visible == false) {
                showLetterObject(
                  currentLetterObjectsOnScene,
                  lettersCurrentlyOnScene[i].id
                );
              }
            }
            // update infobox content
            makeInfoBox();

            break;
          // nichts gecheckt
          case "false-false-false":
            // hides object if visible
            for (let i = 0; i < currentLetterObjectsOnScene.length; i++) {
              if (currentLetterObjectsOnScene[i].visible == true) {
                hideLetterObject(
                  currentLetterObjectsOnScene,
                  lettersCurrentlyOnScene[i].id
                );
              }
            }
            // update infobox content
            makeInfoBox();
            break;

          // nur male geckeckt
          case "true-false-false":
            for (let i = 0; i < currentLetterObjectsOnScene.length; i++) {
              // hides all letters with non-male receivers
              if (
                currentLetterObjectsOnScene[i].element.dataset.gender !=
                "Männlich"
              ) {
                //console.log(i, "männlich");
                hideLetterObject(
                  currentLetterObjectsOnScene,
                  lettersCurrentlyOnScene[i].id
                );
              } else {
                showLetterObject(
                  currentLetterObjectsOnScene,
                  lettersCurrentlyOnScene[i].id
                );
              }
            }
            // update infobox content
            makeInfoBox();
            break;
          // nur female gecheckt
          case "false-true-false":
            for (let i = 0; i < currentLetterObjectsOnScene.length; i++) {
              // hides all letters with non-male receivers
              if (
                currentLetterObjectsOnScene[i].element.dataset.gender !=
                "Weiblich"
              ) {
                //console.log(i, "männlich");
                hideLetterObject(
                  currentLetterObjectsOnScene,
                  lettersCurrentlyOnScene[i].id
                );
              } else {
                showLetterObject(
                  currentLetterObjectsOnScene,
                  lettersCurrentlyOnScene[i].id
                );
              }
            }
            // update infobox content
            makeInfoBox();
            break;
          // nur other gecheckt
          case "false-false-true":
            for (let i = 0; i < currentLetterObjectsOnScene.length; i++) {
              // hides all letters with non-male receivers
              if (
                currentLetterObjectsOnScene[i].element.dataset.gender !=
                "Keine Info"
              ) {
                //console.log(i, "männlich");
                hideLetterObject(
                  currentLetterObjectsOnScene,
                  lettersCurrentlyOnScene[i].id
                );
              } else {
                showLetterObject(
                  currentLetterObjectsOnScene,
                  lettersCurrentlyOnScene[i].id
                );
              }
            }
            // update infobox content
            makeInfoBox();
            break;

          // male und female gecheckt
          case "true-true-false":
            for (let i = 0; i < currentLetterObjectsOnScene.length; i++) {
              // hides all letters with non-male receivers
              if (
                currentLetterObjectsOnScene[i].element.dataset.gender ==
                "Keine Info"
              ) {
                //console.log(i, "männlich");
                hideLetterObject(
                  currentLetterObjectsOnScene,
                  lettersCurrentlyOnScene[i].id
                );
              } else {
                showLetterObject(
                  currentLetterObjectsOnScene,
                  lettersCurrentlyOnScene[i].id
                );
              }
            }
            // update infobox content
            makeInfoBox();
            break;
          // male und other gecheckt
          case "true-false-true":
            for (let i = 0; i < currentLetterObjectsOnScene.length; i++) {
              // hides all letters with non-male receivers
              if (
                currentLetterObjectsOnScene[i].element.dataset.gender ==
                "Weiblich"
              ) {
                //console.log(i, "männlich");
                hideLetterObject(
                  currentLetterObjectsOnScene,
                  lettersCurrentlyOnScene[i].id
                );
              } else {
                showLetterObject(
                  currentLetterObjectsOnScene,
                  lettersCurrentlyOnScene[i].id
                );
              }
            }
            // update infobox content
            makeInfoBox();
            break;
          // female und other
          case "false-true-true":
            for (let i = 0; i < currentLetterObjectsOnScene.length; i++) {
              // hides all letters with non-male receivers
              if (
                currentLetterObjectsOnScene[i].element.dataset.gender ==
                "Männlich"
              ) {
                //console.log(i, "männlich");
                hideLetterObject(
                  currentLetterObjectsOnScene,
                  lettersCurrentlyOnScene[i].id
                );
              } else {
                showLetterObject(
                  currentLetterObjectsOnScene,
                  lettersCurrentlyOnScene[i].id
                );
              }
            }
            // update infobox content
            makeInfoBox();
            break;
          default:
            console.log("Error!");
            break;
        }
      } else {
        // else = if filter mode is not active, only color highlighting
        //update infobox
        makeInfoBox();
      }
    }

    /**
     * Filter controls
     */

    /* Dialog-Box (Information on how to use the single place view) */
    $(function () {
      $("#dialog").dialog();
    });

    /** Slider: Time filter */

    // get year range from start and end date
    function range(start, end) {
      console.log(start, end);
      let yearArray = [];
      let s = parseInt(start);
      let en = parseInt(end);
      for (let i = s, e = en; i <= e; i++) {
        yearArray.push(i.toString());
      }
      // console.log(yearArray);
      return yearArray;
    }

    // what happens when slider is used
    $(function () {
      $("#slider-range").slider({
        range: true,
        min: 1764,
        max: 1772,
        values: [1764, 1772],
        slide: function slide(event, ui) {
          $("#amount").val("" + ui.values[0] + " – " + ui.values[1]);
          console.log("Keep sliding");

          // set time filter
          timeFilterRange = range(ui.values[0], ui.values[1]);

          // clear canvas
          clearCanvas();

          // remove infobox
          removeContentOfInfobox();

          // create spheres
          makeSpheresForSingleView(placename, timeFilterRange);

          // update infobox
          makeInfoBox();
        },
      });

      console.log("Ready");

      $("#amount").val(
        "" +
          $("#slider-range").slider("values", 0) +
          " – " +
          $("#slider-range").slider("values", 1)
      );
    });

    /* Letter Status Filter */

    /* 1.) Color Highlighting */

    // SENT
    $(".sent").change(function () {
      // sets letter object color of sent letters to 'darckorchid' if checkbox is checked
      if ($(this).is(":checked")) {
        // get array of all planes currently on the scene
        let currentLetterObjectsOnScene = getCurrentLetterObjectsOnScene();
        // get array of all the ids of the planes
        let idsOfCurrentLetterObjectsOnScene = getIdsOfLetterObjects(
          currentLetterObjectsOnScene
        );
        // loop over ids and determine if letter has status sent/received by end of idString (r or s)
        idsOfCurrentLetterObjectsOnScene.forEach((id) => {
          if (id.endsWith("s")) {
            changeLetterObjectColor(
              currentLetterObjectsOnScene,
              id,
              "rgb(153, 50, 204, 0.5)"
            );
          }
        });
      } else {
        // sets letter object color color of sent letters back to red if checkbox is unchecked
        let currentLetterObjectsOnScene = getCurrentLetterObjectsOnScene();

        let idsOfCurrentLetterObjectsOnScene = getIdsOfLetterObjects(
          currentLetterObjectsOnScene
        );

        idsOfCurrentLetterObjectsOnScene.forEach((id) => {
          if (id.endsWith("s")) {
            changeLetterObjectColor(
              currentLetterObjectsOnScene,
              id,
              "rgb(204, 0, 0, 0.5)"
            );
          }
        });
      }
    });

    // RECEIVED
    $(".received").change(function () {
      // sets letter object color color of received letters to 'plum' if checkbox is checked
      if ($(this).is(":checked")) {
        // get array of all letter objects currently on the scene
        let currentLetterObjectsOnScene = getCurrentLetterObjectsOnScene();
        // get array of all the ids of the letter objects
        let idsOfCurrentLetterObjectsOnScene = getIdsOfLetterObjects(
          currentLetterObjectsOnScene
        );
        // loop over ids and determine if letter has status sent/received by end of idString (r or s)
        idsOfCurrentLetterObjectsOnScene.forEach((id) => {
          if (id.endsWith("r")) {
            changeLetterObjectColor(
              currentLetterObjectsOnScene,
              id,
              "rgb(221, 160, 221)"
            );
          }
        });
      } else {
        // sets letter object color color of received letters back to red if checkbox is unchecked
        let currentLetterObjectsOnScene = getCurrentLetterObjectsOnScene();

        let idsOfCurrentLetterObjectsOnScene = getIdsOfLetterObjects(
          currentLetterObjectsOnScene
        );

        idsOfCurrentLetterObjectsOnScene.forEach((id) => {
          if (id.endsWith("r")) {
            changeLetterObjectColor(
              currentLetterObjectsOnScene,
              id,
              "rgb(204, 0, 0, 0.5)"
            );
          }
        });
      }
    });

    /* 2.) Filter Mode */

    // SENT
    $(".sent").change(function () {
      // remove content of infobox
      removeContentOfInfobox();

      // hides letter objects of sent letters if sent-checkbox is checked and Filter-Mode-box is also checked
      if ($(this).is(":checked") && $(".filter").is(":checked")) {
        // get array of all planes currently on the scene
        let currentLetterObjectsOnScene = getCurrentLetterObjectsOnScene();
        // get array of all the ids of the planes
        let idsOfCurrentLetterObjectsOnScene = getIdsOfLetterObjects(
          currentLetterObjectsOnScene
        );
        // loop over ids and determine if letter has status sent/received by end of idString (r or s)
        idsOfCurrentLetterObjectsOnScene.forEach((id) => {
          // hides all letters which do  not have the status "sent"
          if (!id.endsWith("s")) {
            hideLetterObject(currentLetterObjectsOnScene, id);
          }
        });
      } else {
        // shows letter objects again once the sent-box is unchecked
        let currentLetterObjectsOnScene = getCurrentLetterObjectsOnScene();

        let idsOfCurrentLetterObjectsOnScene = getIdsOfLetterObjects(
          currentLetterObjectsOnScene
        );

        idsOfCurrentLetterObjectsOnScene.forEach((id) => {
          if (!id.endsWith("s")) {
            showLetterObject(currentLetterObjectsOnScene, id);
          }
        });
      }
      // update infobox content
      makeInfoBox();
    });

    // RECEIVED
    // hides letter objects of received letters if received-checkbox is checked and Filter-Mode-box is also checked
    $(".received").change(function () {
      // remove content of infobox
      removeContentOfInfobox();

      if ($(this).is(":checked") && $(".filter").is(":checked")) {
        // get array of all letter objects currently on the scene
        let currentLetterObjectsOnScene = getCurrentLetterObjectsOnScene();
        // get array of all the ids of the letter objects
        let idsOfCurrentLetterObjectsOnScene = getIdsOfLetterObjects(
          currentLetterObjectsOnScene
        );
        // loop over ids and determine if letter has status sent/received by end of idString (r or s)
        idsOfCurrentLetterObjectsOnScene.forEach((id) => {
          // hides all letter which do not have the letter status "received"
          if (!id.endsWith("r")) {
            hideLetterObject(currentLetterObjectsOnScene, id);
          }
        });
      } else {
        // shows letter objects again once the received-box is unchecked
        let currentLetterObjectsOnScene = getCurrentLetterObjectsOnScene();

        let idsOfCurrentLetterObjectsOnScene = getIdsOfLetterObjects(
          currentLetterObjectsOnScene
        );

        idsOfCurrentLetterObjectsOnScene.forEach((id) => {
          if (!id.endsWith("r")) {
            showLetterObject(currentLetterObjectsOnScene, id);
          }
        });
      }

      // update infobox content
      makeInfoBox();
    });

    /* Document Type Filter */

    /* 1.) Color Highlighting */

    // LETTERS
    $(".goetheletter").change(function () {
      // sets letter objects color to 'red' if checkbox is checked and doctype is goetheletter
      if ($(this).is(":checked")) {
        // get array of all letter objects currently on the scene
        let currentLetterObjectsOnScene = getCurrentLetterObjectsOnScene();
        // get array of all the ids of the planes
        let idsOfCurrentLetterObjectsOnScene = getIdsOfLetterObjects(
          currentLetterObjectsOnScene
        );
        // loop over ids and determine if document is letter
        idsOfCurrentLetterObjectsOnScene.forEach((id) => {
          if (id.startsWith("GB")) {
            changeLetterObjectColor(
              currentLetterObjectsOnScene,
              id,
              "rgb(204, 0, 0, 0.5)"
            );
          }
        });
      } else {
        // sets letter objects color to default color if checkbox is unchecked and doctype is goetheletter
        let currentLetterObjectsOnScene = getCurrentLetterObjectsOnScene();

        let idsOfCurrentLetterObjectsOnScene = getIdsOfLetterObjects(
          currentLetterObjectsOnScene
        );

        idsOfCurrentLetterObjectsOnScene.forEach((id) => {
          if (id.startsWith("GB")) {
            changeLetterObjectColor(
              currentLetterObjectsOnScene,
              id,
              "rgb(204, 0, 0, 0.5)"
            );
          }
        });
      }
    });

    // DIARIES
    $(".goethediary").change(function () {
      // sets letter objects color to blue if checkbox is checked and doctype is goethediary
      if ($(this).is(":checked")) {
        // get array of all letter objects currently on the scene
        let currentLetterObjectsOnScene = getCurrentLetterObjectsOnScene();
        // get array of all the ids of the letter objects
        let idsOfCurrentLetterObjectsOnScene = getIdsOfLetterObjects(
          currentLetterObjectsOnScene
        );
        // loop over ids and determine if document is diary
        idsOfCurrentLetterObjectsOnScene.forEach((id) => {
          if (id.startsWith("GT")) {
            changeLetterObjectColor(
              currentLetterObjectsOnScene,
              id,
              "rgb(203, 231, 249, 0.5)"
            );
          }
        });
      } else {
        // sets letter objects color to default color if checkbox is unchecked and doctype is goethediary
        let currentLetterObjectsOnScene = getCurrentLetterObjectsOnScene();

        let idsOfCurrentLetterObjectsOnScene = getIdsOfLetterObjects(
          currentLetterObjectsOnScene
        );

        idsOfCurrentLetterObjectsOnScene.forEach((id) => {
          if (id.startsWith("GT")) {
            changeLetterObjectColor(
              currentLetterObjectsOnScene,
              id,
              "rgb(204, 0, 0, 0.5)"
            );
          }
        });
      }
    });

    /* 2.) Filter Mode */

    // LETTERS
    $(".goetheletter").change(function () {
      // remove content of infobox
      removeContentOfInfobox();

      // hides letter letter objects if letter-box and filter-mode-box are checked
      if ($(this).is(":checked") && $(".filter").is(":checked")) {
        // get array of all letter objects currently on the scene
        let currentLetterObjectsOnScene = getCurrentLetterObjectsOnScene();
        // get array of all the ids of the letter objects
        let idsOfCurrentLetterObjectsOnScene = getIdsOfLetterObjects(
          currentLetterObjectsOnScene
        );
        // loop over ids and determine if document is letter
        idsOfCurrentLetterObjectsOnScene.forEach((id) => {
          // hides all documents which are not of type GB
          if (!id.startsWith("GB")) {
            hideLetterObject(currentLetterObjectsOnScene, id);
          }
        });
      } else {
        // shows letter objects again once letter-box is unchecked
        let currentLetterObjectsOnScene = getCurrentLetterObjectsOnScene();

        let idsOfCurrentLetterObjectsOnScene = getIdsOfLetterObjects(
          currentLetterObjectsOnScene
        );

        idsOfCurrentLetterObjectsOnScene.forEach((id) => {
          if (!id.startsWith("GB")) {
            showLetterObject(currentLetterObjectsOnScene, id);
          }
        });
      }

      // update infobox content
      makeInfoBox();
    });

    // DIARIES
    $(".goethediary").change(function () {
      // remove content of infobox
      removeContentOfInfobox();

      // hides diary letter objects if diary-box and filter-mode-box are checked
      if ($(this).is(":checked") && $(".filter").is(":checked")) {
        // get array of all letter objects currently on the scene
        let currentLetterObjectsOnScene = getCurrentLetterObjectsOnScene();
        // get array of all the ids of the letter objects
        let idsOfCurrentLetterObjectsOnScene = getIdsOfLetterObjects(
          currentLetterObjectsOnScene
        );
        // loop over ids and determine if document is diary
        idsOfCurrentLetterObjectsOnScene.forEach((id) => {
          // hides all documents which are not of type "GT"
          if (!id.startsWith("GT")) {
            hideLetterObject(currentLetterObjectsOnScene, id);
          }
        });
      } else {
        // shows letter objects again once diary-box is unchecked
        let currentLetterObjectsOnScene = getCurrentLetterObjectsOnScene();

        let idsOfCurrentLetterObjectsOnScene = getIdsOfLetterObjects(
          currentLetterObjectsOnScene
        );

        idsOfCurrentLetterObjectsOnScene.forEach((id) => {
          if (!id.startsWith("GT")) {
            showLetterObject(currentLetterObjectsOnScene, id);
          }
        });
      }
      // update infobox content
      makeInfoBox();
    });

    /* Gender Filter */

    /* 1.) Color Highlighting */

    // MALE
    $(".male").change(function () {
      // CHECKED
      // sets letter objects color of letters with male receiver to grey if checkbox is checked
      if ($(this).is(":checked")) {
        // get array of all planes currently on the scene
        let currentLetterObjectsOnScene = getCurrentLetterObjectsOnScene();
        // get array of all the ids of the planes
        let idsOfCurrentLetterObjectsOnScene = getIdsOfLetterObjects(
          currentLetterObjectsOnScene
        );

        let lettersCurrentlyOnScene = getletterDataOfLetterObjects(
          idsOfCurrentLetterObjectsOnScene
        );

        // count number of male recipients
        let maleCounter = 0;

        for (let i = 0; i < lettersCurrentlyOnScene.length; i++) {
          if (lettersCurrentlyOnScene[i].receiverGender == "Männlich") {
            //console.log(i, "männlich");
            changeLetterObjectColor(
              currentLetterObjectsOnScene,
              lettersCurrentlyOnScene[i].id,
              "rgb(203, 231, 249, 0.5)"
            );
            maleCounter++;
          }
        }
      }

      // UNCHECKED
      if (!$(this).is(":checked")) {
        // get array of all letter objects currently on the scene
        let currentLetterObjectsOnScene = getCurrentLetterObjectsOnScene();
        // get array of all the ids of the letter objects
        let idsOfCurrentLetterObjectsOnScene = getIdsOfLetterObjects(
          currentLetterObjectsOnScene
        );

        let lettersCurrentlyOnScene = getletterDataOfLetterObjects(
          idsOfCurrentLetterObjectsOnScene
        );

        for (let i = 0; i < lettersCurrentlyOnScene.length; i++) {
          if (lettersCurrentlyOnScene[i].receiverGender == "Männlich") {
            //console.log(i, "männlich");
            changeLetterObjectColor(
              currentLetterObjectsOnScene,
              lettersCurrentlyOnScene[i].id,
              // default color
              "rgb(204, 0, 0, 0.5)"
            );
          }
        }
      }
    });

    // FEMALE
    $(".female").change(function () {
      // CHECKED
      // sets letter objects color of letters with female receiver to oange if checkbox is checked
      if ($(this).is(":checked")) {
        // get array of all letter objects currently on the scene
        let currentLetterObjectsOnScene = getCurrentLetterObjectsOnScene();
        // get array of all the ids of the letter objects
        let idsOfCurrentLetterObjectsOnScene = getIdsOfLetterObjects(
          currentLetterObjectsOnScene
        );

        let lettersCurrentlyOnScene = getletterDataOfLetterObjects(
          idsOfCurrentLetterObjectsOnScene
        );

        // count number of female recipients
        let femaleCounter = 0;

        for (let i = 0; i < lettersCurrentlyOnScene.length; i++) {
          if (lettersCurrentlyOnScene[i].receiverGender == "Weiblich") {
            //console.log(i, "weiblich");
            changeLetterObjectColor(
              currentLetterObjectsOnScene,
              lettersCurrentlyOnScene[i].id,
              "rgb(255, 165, 0, 0.5)"
            );
            femaleCounter++;
          }
        }
      }

      // UNCHECKED
      if (!$(this).is(":checked")) {
        // get array of all letter objects currently on the scene
        let currentLetterObjectsOnScene = getCurrentLetterObjectsOnScene();
        // get array of all the ids of the letter objects
        let idsOfCurrentLetterObjectsOnScene = getIdsOfLetterObjects(
          currentLetterObjectsOnScene
        );

        let lettersCurrentlyOnScene = getletterDataOfLetterObjects(
          idsOfCurrentLetterObjectsOnScene
        );

        for (let i = 0; i < lettersCurrentlyOnScene.length; i++) {
          if (lettersCurrentlyOnScene[i].receiverGender == "Weiblich") {
            //console.log(i, "weiblich");
            changeLetterObjectColor(
              currentLetterObjectsOnScene,
              lettersCurrentlyOnScene[i].id,
              // default color
              "rgb(204, 0, 0, 0.5)"
            );
          }
        }
      }
    });

    // OTHER / UNKNOWN
    $(".other").change(function () {
      // CHECKED
      // sets letter objects color of letters with unknown receiver to transparent if checkbox is checked
      if ($(this).is(":checked")) {
        // get array of all letter objects currently on the scene
        let currentLetterObjectsOnScene = getCurrentLetterObjectsOnScene();
        // get array of all the ids of the letter objects
        let idsOfCurrentLetterObjectsOnScene = getIdsOfLetterObjects(
          currentLetterObjectsOnScene
        );

        let lettersCurrentlyOnScene = getletterDataOfLetterObjects(
          idsOfCurrentLetterObjectsOnScene
        );

        // count number of female recipients
        let otherCounter = 0;

        for (let i = 0; i < lettersCurrentlyOnScene.length; i++) {
          if (lettersCurrentlyOnScene[i].receiverGender == "Keine Info") {
            //console.log(i, "Keine Info");
            changeLetterObjectColor(
              currentLetterObjectsOnScene,
              lettersCurrentlyOnScene[i].id,
              "rgb(0,0,0, 0.5)"
            );
            otherCounter++;
          }
        }
      }

      // UNCHECKED
      if (!$(this).is(":checked")) {
        // get array of all letter objects currently on the scene
        let currentLetterObjectsOnScene = getCurrentLetterObjectsOnScene();
        // get array of all the ids of the letter objects
        let idsOfCurrentLetterObjectsOnScene = getIdsOfLetterObjects(
          currentLetterObjectsOnScene
        );

        let lettersCurrentlyOnScene = getletterDataOfLetterObjects(
          idsOfCurrentLetterObjectsOnScene
        );

        for (let i = 0; i < lettersCurrentlyOnScene.length; i++) {
          if (lettersCurrentlyOnScene[i].receiverGender == "Keine Info") {
            //console.log(i, "Keine Info");
            changeLetterObjectColor(
              currentLetterObjectsOnScene,
              lettersCurrentlyOnScene[i].id,
              // default color
              "rgb(204, 0, 0, 0.5)"
            );
          }
        }
      }
    });

    /* 2.) Filter Mode */

    // MALE
    $(".male").change(function () {
      // remove content of infobox
      removeContentOfInfobox();

      genderFilter();
    });

    // FEMALE
    $(".female").change(function () {
      // remove content of infobox
      removeContentOfInfobox();

      genderFilter();
    });

    // OTHER
    $(".other").change(function () {
      // remove content of infobox
      removeContentOfInfobox();

      genderFilter();
    });

    /**
     * Infobox
     */

    /**
     * @function getLetterDataOfLetterObjectsCurrentlyVisibleOnScene
     * @desc This functions returns the data of the letters associated to all the letter object currently visible on the scene. 
     * @returns Object.<string,string>[]
     */
    function getLetterDataOfLetterObjectsCurrentlyVisibleOnScene() {
      let currentlyVisibleLetterObjectsOnScene =
        getCurrentlyVisibleLetterObjectsOnScene();
      let idsOfCurrentLetterObjectsOnScene = getIdsOfLetterObjects(
        currentlyVisibleLetterObjectsOnScene
      );
      let letterDataOfCurrentlyVisibleLettersOnScene =
        getletterDataOfLetterObjects(idsOfCurrentLetterObjectsOnScene);
      console.log(
        "letters visible",
        letterDataOfCurrentlyVisibleLettersOnScene
      );
      return letterDataOfCurrentlyVisibleLettersOnScene;
    }

    /**
     * @function getNumLetters
     * @desc This function returns how many letters are currently visible on the scene.
     * @returns number
     */
    function getNumLetters() {
      const lettersCurrentlyOnScene =
        getLetterDataOfLetterObjectsCurrentlyVisibleOnScene();
      let numLetters = lettersCurrentlyOnScene.length;
      return numLetters;
    }

    /**
     * @function getNumSent
     * @desc This function returns how many letters with status "sent" are currently visible on the scene.
     * @returns number
     */
    function getNumSent() {
      const lettersCurrentlyOnScene =
        getLetterDataOfLetterObjectsCurrentlyVisibleOnScene();
      let numSent = 0;
      lettersCurrentlyOnScene.forEach((letter) => {
        if (letter.id.endsWith("s")) {
          numSent++;
        }
      });
      return numSent;
    }

    /**
     * @function getNumReceived
     * @desc This function returns how many letters with status "received" are currently visible on the scene.
     * @returns number
     */
    function getNumReceived() {
      const lettersCurrentlyOnScene =
        getLetterDataOfLetterObjectsCurrentlyVisibleOnScene();
      let numReceived = 0;
      lettersCurrentlyOnScene.forEach((letter) => {
        if (letter.id.endsWith("r")) {
          numReceived++;
        }
      });
      return numReceived;
    }

    /**
     * @function getNumFemale
     * @desc This function returns how many letters with gender of receiver "female" are currently visible on the scene.
     * @returns number
     */
    function getNumFemale() {
      const lettersCurrentlyOnScene =
        getLetterDataOfLetterObjectsCurrentlyVisibleOnScene();
      let numFemale = 0;
      lettersCurrentlyOnScene.forEach((letter) => {
        if (letter.receiverGender == "Weiblich") {
          numFemale++;
        }
      });
      return numFemale;
    }

    /**
     * @function getNumMale
     * @desc This function returns how many letters with gender of receiver "male" are currently visible on the scene.
     * @returns number
     */
    function getNumMale() {
      const lettersCurrentlyOnScene =
        getLetterDataOfLetterObjectsCurrentlyVisibleOnScene();
      let numMale = 0;
      lettersCurrentlyOnScene.forEach((letter) => {
        if (letter.receiverGender == "Männlich") {
          numMale++;
        }
      });
      return numMale;
    }

    /**
     * @function getNumOther
     * @desc This function returns how many letters with gender of receiver "Keine Info"/other are currently visible on the scene.
     * @returns number
     */
    function getNumOther() {
      const lettersCurrentlyOnScene =
        getLetterDataOfLetterObjectsCurrentlyVisibleOnScene();
      let numOther = 0;
      lettersCurrentlyOnScene.forEach((letter) => {
        if (letter.receiverGender == "Keine Info") {
          numOther++;
        }
      });
      return numOther;
    }

    /**
     * @function makeInfoBox
     * @desc Creates the p-Tags with the content of the infobox.
     * @returns nothing
     */
    function makeInfoBox() {
      const numLetters = getNumLetters();
      const numSent = getNumSent();
      const numReceived = getNumReceived();
      const numFemale = getNumFemale();
      const numMale = getNumMale();
      const numOther = getNumOther();

      // make p elements
      const pNumLetters = document.createElement("p");
      pNumLetters.textContent = `${numLetters} Briefe Goethes werden angezeigt`;

      const pNumSent = document.createElement("p");
      pNumSent.textContent = `${numSent} aus ${placename} gesendet`;

      const pNumReceived = document.createElement("p");
      pNumReceived.textContent = `${numReceived} in ${placename} empfangen`;

      const pNumFemale = document.createElement("p");
      pNumFemale.textContent = `${numFemale} Adressat:innen mit Geschlecht "weiblich"`;

      const pNumMale = document.createElement("p");
      pNumMale.textContent = `${numMale} Adressat:innen mit Geschlecht "männlich"`;

      const pNumOther = document.createElement("p");
      pNumOther.textContent = `${numOther} Adressat:innen mit Geschlecht "andere/unbekannt"`;

      const infobox = document.getElementById("infobox");
      infobox.appendChild(pNumLetters);
      infobox.appendChild(pNumSent);
      infobox.appendChild(pNumReceived);
      infobox.appendChild(pNumFemale);
      infobox.appendChild(pNumMale);
      infobox.appendChild(pNumOther);
    }

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
    /* const ambient_light = new THREE.AmbientLight(0x404040, 1.0);
    scene.add(ambient_light); */

    // PointLight
    /* const pointLight = new THREE.PointLight(
      // Farbe
      0xffffff,
      // Intensität
      0.5
    );
    pointLight.position.x = -6.5;
    pointLight.position.y = 100;
    pointLight.position.z = 6;
    scene.add(pointLight);

    const pointLightColor = { color: 0xff0000 }; */

    /**
     * Helper geos for lights
     */

    // creates a geometric form that represents the light so you know where exactly the light is
    // there is a helper for every kind of light

    /* const pointLighthelper = new THREE.PointLightHelper(pointLight, 1);
    scene.add(pointLighthelper);
 */
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
      renderer.setSize(sizes.width, 1000);
      if (renderer.name == "WebGL") {
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      }
    });

    /**
     * Debug GUI
     */
    //const gui = new dat.GUI();
    // must be wider than default, so that also long labels are visible e.g. "y_GB01 Nr.EB013"
    //gui.width = 310;

    // Set GUI folders
    /* const cameraGui = gui.addFolder("Camera");
    const light = gui.addFolder("Light");
    const idTextGui = gui.addFolder("idText");
    const initialsGui = gui.addFolder("initials");
    const firstNameGui = gui.addFolder("firstname");
    const lastNameGui = gui.addFolder("lastname");
    const dateGui = gui.addFolder("date");
    const letterNumMarkerGui = gui.addFolder("letterNumMarker"); */

    // Set Debug GUI
    /*  light.add(pointLight.position, "y").min(-10).max(100).step(0.01);
    light.add(pointLight.position, "x").min(-10).max(10).step(0.01);
    light.add(pointLight.position, "z").min(-10).max(10).step(0.01);
    light.add(pointLight, "intensity").min(0).max(15).step(0.01);
    light.addColor(pointLightColor, "color").onChange(() => {
      pointLight.color.set(pointLightColor.color);
    }); */

    /**
     * Camera
     */

    let camera = new THREE.PerspectiveCamera(
      40,
      window.innerWidth / window.innerHeight,
      1,
      10000
    );
    /* camera.position.y = 0;
    camera.position.z = 0;
    camera.position.x = 0; */

    camera.position.z = 10000;
    camera.position.x = 7500;
    camera.position.y = 3040;
    camera.zoom = 1;
    //camera.updateProjectionMatrix();
    //camera.lookAt(new Vector3(0,1000,0));
    //camera.position.y = 3000;
    //camera.updateProjectionMatrix();
    //camera.lookAt(new Vector3(0,1000,0));

    /* cameraGui.add(camera.position, "y").min(0).max(10000).step(10);
    cameraGui.add(camera.position, "x").min(0).max(10000).step(10);
    cameraGui.add(camera.position, "z").min(0).max(10000).step(10); */

    camera.updateProjectionMatrix();
    scene.add(camera);

    /* move camera in y axis with arrow keys up and down */
    document.onkeydown = function (e) {
      console.log(e.key);
      switch (e.key) {
        case "+":
          camera.position.y += 100;
          camera.updateProjectionMatrix();

          // controls need to be updated too, otherwise as soon as you use the mouse to move the camera jumps to its inital position
          controls.target.y = camera.position.y;
          break;
        case "-":
          camera.position.y -= 100;
          camera.updateProjectionMatrix();

          controls.target.y = camera.position.y;
          break;
        case "ArrowLeft":
          // do nothing
          break;
        case "ArrowRight":
        // do nothing
      }
    };

    /**
     * Controls
     */

    let controls = new OrbitControls(camera, renderer.domElement);
    controls.target.x = 0;
    controls.target.z = 0;
    controls.target.y = 0;

    controls.minPolarAngle = Math.PI / 2;
    controls.maxPolarAngle = Math.PI / 2 + 0.75;

    controls.enablePan = false;

    console.log("Control target");
    console.log(controls.target);

    /**
     * Mouse interaction
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

    // update mouse coordinates according to mouse position on screen
    document.addEventListener("mousemove", (e) => {
      mousemove.mouseX = e.clientX - mousemove.windowHalfX;
      mousemove.mouseY = e.clientY - mousemove.windowHalfY;
      // raycaster needs a normalized coordinate system based on coordinates of mouse pointer
      // raycaster is newly set within each animation loop according to the updated mouse coordinates (see below)
      // division by innerWidth/innerHeight and multiplication with 2-1/2+1 turns x and y into values between -1 and 1
      mousemove.normalizedMouse.x = (e.clientX / window.innerWidth) * 2 - 1;
      mousemove.normalizedMouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
    });

    const clock = new THREE.Clock();

    const tick = () => {
      mousemove.targetX = mousemove.mouseX * 0.001;
      mousemove.targetY = mousemove.mouseY * 0.001;

      const elapsedTime = clock.getElapsedTime();

      // Render
      renderer.render(scene, camera);

      // Call tick again on the next frame
      window.requestAnimationFrame(tick);
    };

    tick();
  }); // FETCH END
