let index = 0;
let score = 0;

async function loadWords() {
  const res = await fetch("words.json");
  return await res.json();
}

function showWord(words) {
  const word = words[index];
  document.getElementById("game").innerHTML = `
    <p><b>${word.turkish}</b></p>
    <p>What does it mean?</p>
    <button onclick="check('${word.english}', '${word.english}')">${word.english}</button>
    <button onclick="check('${word.english}', 'car')">car</button>
    <button onclick="check('${word.english}', 'house')">house</button>
    <button onclick="check('${word.english}', 'school')">school</button>
  `;
}

function check(correct, answer) {
  if (correct === answer) {
    alert("Correct!");
    score++;
  } else {
    alert("Try again!");
  }
}

document.getElementById("next").addEventListener("click", async () => {
  const words = await loadWords();
  index = (index + 1) % words.length;
  showWord(words);
});

loadWords().then(showWord);
script.js
