/**
 * Hot Seat lifeline logic — reliability decreases with question level.
 *
 * Q1-Q5 (easy):   Audience 70-90% correct, Phone always right
 * Q6-Q10 (medium): Audience 45-65% correct, Phone 70% right
 * Q11-Q15 (hard):  Audience 25-45% correct, Phone 40% right
 */

export interface AudiencePoll {
  [choice: string]: number;
}

export interface PhoneResult {
  text: string;
  pointsToCorrect: boolean;
}

function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

/**
 * Generate an audience poll result.
 * At higher levels, a wrong answer may get the highest percentage.
 */
export function generateAudiencePoll(
  correctAnswer: string,
  availableChoices: string[],
  questionIndex: number
): AudiencePoll {
  const poll: AudiencePoll = {};
  const wrongChoices = availableChoices.filter((c) => c !== correctAnswer);

  // Determine if audience gets it right
  let audienceCorrect: boolean;
  let correctPct: number;

  if (questionIndex < 5) {
    // Q1-Q5: audience almost always right
    audienceCorrect = true;
    correctPct = 70 + Math.floor(Math.random() * 21); // 70-90%
  } else if (questionIndex < 10) {
    // Q6-Q10: audience often right but not always
    audienceCorrect = Math.random() < 0.65;
    correctPct = audienceCorrect
      ? 45 + Math.floor(Math.random() * 21) // 45-65% when right
      : 15 + Math.floor(Math.random() * 16); // 15-30% when wrong
  } else {
    // Q11-Q15: audience frequently wrong
    audienceCorrect = Math.random() < 0.35;
    correctPct = audienceCorrect
      ? 35 + Math.floor(Math.random() * 16) // 35-50% when right
      : 10 + Math.floor(Math.random() * 16); // 10-25% when wrong
  }

  poll[correctAnswer] = correctPct;

  if (!audienceCorrect && wrongChoices.length > 0) {
    // Give a wrong answer the highest percentage
    const misleadingChoice = wrongChoices[Math.floor(Math.random() * wrongChoices.length)];
    const misleadingPct = correctPct + 10 + Math.floor(Math.random() * 16); // always higher
    const totalAssigned = correctPct + misleadingPct;

    if (totalAssigned > 95) {
      // Adjust to fit within 100
      poll[misleadingChoice] = 100 - correctPct - (wrongChoices.length - 1);
    } else {
      poll[misleadingChoice] = misleadingPct;
    }

    // Distribute remainder to other wrong choices
    let remaining = 100 - (poll[correctAnswer] + poll[misleadingChoice]);
    const otherWrong = wrongChoices.filter((c) => c !== misleadingChoice);
    otherWrong.forEach((c, i) => {
      if (i === otherWrong.length - 1) {
        poll[c] = Math.max(0, remaining);
      } else {
        const pct = Math.floor(Math.random() * Math.max(1, remaining));
        poll[c] = pct;
        remaining -= pct;
      }
    });
  } else {
    // Audience is right — distribute remaining among wrong choices
    let remaining = 100 - correctPct;
    wrongChoices.forEach((c, i) => {
      if (i === wrongChoices.length - 1) {
        poll[c] = Math.max(0, remaining);
      } else {
        const pct = Math.floor(Math.random() * Math.max(1, remaining + 1));
        poll[c] = pct;
        remaining -= pct;
      }
    });
  }

  return poll;
}

/**
 * Generate a phone-a-friend result.
 * At higher levels, the friend may confidently point to a wrong answer.
 */
export function generatePhoneResult(
  correctAnswer: string,
  explanation: string,
  choices: string[],
  questionIndex: number
): PhoneResult {
  // Determine if the friend is right
  let friendCorrect: boolean;

  if (questionIndex < 5) {
    // Q1-Q5: friend always knows
    friendCorrect = true;
  } else if (questionIndex < 10) {
    // Q6-Q10: friend right ~70% of the time
    friendCorrect = Math.random() < 0.70;
  } else {
    // Q11-Q15: friend right ~40% of the time
    friendCorrect = Math.random() < 0.40;
  }

  if (friendCorrect) {
    return {
      text: explanation || "I'm pretty sure about this one...",
      pointsToCorrect: true,
    };
  }

  // Friend is wrong — pick a random wrong answer and sound confident
  const wrongChoices = choices.filter((c) => c !== correctAnswer);
  const wrongPick = wrongChoices[Math.floor(Math.random() * wrongChoices.length)];

  const wrongPhrases = [
    `I'm fairly confident it's "${wrongPick}". That's what I'd go with.`,
    `Hmm, this is tricky... but I think the answer is "${wrongPick}".`,
    `I remember studying this — I'd say "${wrongPick}".`,
    `I'm about 80% sure it's "${wrongPick}". Go with that.`,
    `My gut says "${wrongPick}". I've seen this come up before.`,
    `I'd go with "${wrongPick}" on this one. Pretty sure that's right.`,
  ];

  return {
    text: wrongPhrases[Math.floor(Math.random() * wrongPhrases.length)],
    pointsToCorrect: false,
  };
}
