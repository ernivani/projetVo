// ==UserScript==
// @name           Apprentissage de l'orthographe
// @namespace      http://example.com
// @version        1.0
// @description    Script Tampermonkey pour apprendre l'orthographe en français depuis Projet Voltaire.
// @match          https://www.projet-voltaire.fr/*
// @grant          none
// ==/UserScript==

(function () {
	"use strict";

	const selectors = {
		sentence: ".sentence",
		noMistakeButton: ".noMistakeButton",
		nextButton: ".nextButton",
		understoodButton: ".understoodButton",
		buttonOk: ".buttonOk",
		exitButton: ".exitButton",
		answerWord: ".answerWord",
		playButton:
			".activity-selector-cell.singleRunnable .activity-selector-cell-container .activity-selector-cell-main",
		//
	};

	const ws = new WebSocket("wss://api.impin.fr/");
	let understand = false;
	let continueLearning = true; // Variable de contrôle pour continuer ou arrêter l'apprentissage

	ws.onopen = () => {};

	ws.onmessage = (event) => {
		const result = JSON.parse(event.data);

		if (result.payload.correct === 1) {
			const noMistakeButton = document.querySelector(
				selectors.noMistakeButton
			);
			// check if in the page there is a span with the title Mauvaise réponse
			if (noMistakeButton) {
				noMistakeButton.click();
			}
			// todo: attendre 0.2 secondes que la page se mette à jour

			setTimeout(() => {}, 200);

			const spanAnswer = document.querySelector(
				"span[title='Mauvaise réponse']"
			);
			if (spanAnswer) {
				const answerWord = document.querySelector(selectors.answerWord);
				if (answerWord) {
					// send the sentence to the server with the answerWord
					var sentence = document.querySelector(selectors.sentence);
					if (sentence) {
						sentence = sentence.innerText;
					}

					ws.send(
						JSON.stringify({
							type: "sentenceCheckAnswer",
							payload: {
								sentence: sentence,
								answerWord: answerWord.innerText,
							},
						})
					);
				}
			}
			const nextButton = document.querySelector(selectors.nextButton);
			if (nextButton) {
				nextButton.click();
			}
		} else if (result.payload.correct === 0) {
			var sentence = document.querySelector(selectors.sentence);
			if (sentence) {
				const errorNode = Array.from(sentence.childNodes).find(
					(node) => {
						if (
							node.innerText.trim() ===
							result.payload.incorrect_word
								.trim()
								.replace(/^['’]/, "")
								.replace(/‑/g, " ")
								.split(/[\s'’.,;:!?\u2026]/)[0]
								.trim()
						) {
							return node;
						}
					}
				);
				if (errorNode) {
					errorNode.click();
					const nextButton = document.querySelector(
						selectors.nextButton
					);
					if (nextButton) {
						nextButton.click();
					}
				} else {
					console.error("Error not found");
				}
			}
		}
	};

	function learnSpelling() {
		if (!continueLearning) {
			return; // Arrêter l'exécution si continueLearning est false
		}

		var sentenceElement = document.querySelector(selectors.sentence);
		if (sentenceElement) {
			var sentence = sentenceElement.innerText;

			ws.send(
				JSON.stringify({
					type: "sentenceCheck",
					payload: sentence,
				})
			);
		}

		const understoodButton = document.querySelector(
			selectors.understoodButton
		);

		if (understoodButton && !understand) {
			understoodButton.click();
			understand = true;
		}

		if (understand) {
			var buttonOk = document.querySelectorAll(selectors.buttonOk); // select all elements with selector buttonOk

			if (buttonOk) {
				buttonOk.forEach((element) => {
					element.click();
				});
			}

			var exitButton = document.querySelector(selectors.exitButton);
			if (exitButton) {
				exitButton.click();
			}

			understand = false;
		}
	}

	function main() {
		if (document.readyState === "complete") {
			const playButton = document.querySelector(selectors.playButton);
			if (playButton) {
				playButton.click();
			}
			learnSpelling();
		}
	}

	window.addEventListener("load", function () {
		setInterval(main, 1300);
	});
})();
