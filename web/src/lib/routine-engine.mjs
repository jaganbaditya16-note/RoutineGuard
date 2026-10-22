export const MAX_SENSOR_AGE_MINUTES = 15;

const severityRank = {
  pass: 0,
  review: 1,
  unknown: 2,
  blocked: 3,
};

export function overlaps(first, second) {
  return (
    Number.isFinite(first?.startMinute) &&
    Number.isFinite(first?.endMinute) &&
    Number.isFinite(second?.startMinute) &&
    Number.isFinite(second?.endMinute) &&
    first.startMinute < first.endMinute &&
    second.startMinute < second.endMinute &&
    first.startMinute < second.endMinute &&
    second.startMinute < first.endMinute
  );
}

function makeFinding(code, severity, evidence, recommendation) {
  return { code, severity, evidence, recommendation };
}

export function evaluateRoutine(input) {
  const findings = [];

  const devicesById = new Map(
    input.devices.map((device) => [device.id, device]),
  );

  // Check every device required by the routine under test.
  for (const step of input.routine.steps) {
    const device = devicesById.get(step.deviceId);

    if (!device) {
      findings.push(
        makeFinding(
          "DEVICE_NOT_FOUND",
          "blocked",
          `${step.label}: device ${step.deviceId} is not configured.`,
          "Configure the device or remove the invalid step, then test again.",
        ),
      );
      continue;
    }

    if (device.status === "offline") {
      findings.push(
        makeFinding(
          "DEVICE_OFFLINE",
          "blocked",
          `${step.label}: ${device.label} is offline.`,
          "Restore the device connection or remove this step, then test again.",
        ),
      );
    } else if (device.status !== "online") {
      findings.push(
        makeFinding(
          "DEVICE_STATE_UNKNOWN",
          "unknown",
          `${step.label}: ${device.label} has an unknown connection state.`,
          "Check the device connection and refresh its status before relying on this routine.",
        ),
      );
    }
  }

  // Require present, online, recent sensor readings.
  for (const sensorId of input.requiredSensorIds) {
    const reading = input.sensorReadings.find(
      (sensor) => sensor.sensorId === sensorId,
    );

    const stale =
      reading &&
      (
        !Number.isFinite(reading.updatedMinutesAgo) ||
        reading.updatedMinutesAgo < 0 ||
        reading.updatedMinutesAgo > MAX_SENSOR_AGE_MINUTES
      );

    if (
      !reading ||
      reading.status !== "online" ||
      reading.value == null ||
      stale
    ) {
      const label = reading?.label || sensorId;

      findings.push(
        makeFinding(
          "SENSOR_DATA_UNAVAILABLE",
          "unknown",
          `${label}: reading is missing, offline, or stale.`,
          "Restore the sensor data source and obtain a fresh reading. Do not treat missing data as an all-clear.",
        ),
      );
    }
  }

  // Build one list containing the tested routine and every other routine.
  const scheduledSteps = [
    { name: input.routine.name, steps: input.routine.steps },
    ...(input.otherRoutines || []),
  ].flatMap((routine) =>
    routine.steps.map((step) => ({
      ...step,
      routineName: routine.name,
    })),
  );

  // Invalid windows must never silently count as a successful check.
  // Check the primary routine and other routines before checking overlaps.
  for (const step of scheduledSteps) {
    const window = step.schedule;

    if (
      !window ||
      !Number.isFinite(window.startMinute) ||
      !Number.isFinite(window.endMinute) ||
      window.startMinute >= window.endMinute
    ) {
      findings.push(
        makeFinding(
          "SCHEDULE_INVALID",
          "unknown",
          `${step.routineName}: "${step.label}" has a missing or invalid schedule window.`,
          "Provide a valid start and end time, with the start before the end, then test again.",
        ),
      );
    }
  }

  // Compare actions on the same device only when their valid time windows
  // overlap and the actions conflict.
  for (let i = 0; i < scheduledSteps.length; i += 1) {
    for (let j = i + 1; j < scheduledSteps.length; j += 1) {
      const first = scheduledSteps[i];
      const second = scheduledSteps[j];

      if (
        first.deviceId === second.deviceId &&
        first.action !== second.action &&
        overlaps(first.schedule, second.schedule)
      ) {
        findings.push(
          makeFinding(
            "SCHEDULE_CONFLICT",
            "review",
            `${first.routineName}: ${first.action} conflicts with ${second.routineName}: ${second.action} on ${first.deviceId}.`,
            "Adjust the schedule or define an explicit priority, then run the check again.",
          ),
        );
      }
    }
  }

  // Severity order: blocked > unknown > review > pass.
  const highestSeverity = findings.reduce(
    (highest, finding) =>
      severityRank[finding.severity] > severityRank[highest]
        ? finding.severity
        : highest,
    "pass",
  );

  const statusBySeverity = {
    pass: "PASS",
    review: "REVIEW",
    blocked: "BLOCKED",
    unknown: "UNKNOWN",
  };

  const titleBySeverity = {
    pass: "No conflicts found in this scenario.",
    review: "Conflicting instructions need attention.",
    blocked: "Don't mark this routine complete yet.",
    unknown: "The routine status cannot be fully verified.",
  };

  const descriptionBySeverity = {
    pass:
      "The provided sample inputs passed the consistency checks. This does not verify a real home or device.",
    review:
      "Different scheduled actions target the same device during overlapping time intervals.",
    blocked:
      "At least one required action targets an offline or unconfigured device. Its successful execution cannot be verified.",
    unknown:
      "Required device, sensor, or schedule information is missing, invalid, stale, or unknown. RoutineGuard cannot infer that the situation is safe.",
  };

  const evidence = findings.length
    ? findings.map((finding) => finding.evidence).join(" · ")
    : "Required device targets are online · Required sample sensor data is fresh · No conflicting scheduled actions found.";

  const recommendation = findings.length
    ? [...new Set(findings.map((finding) => finding.recommendation))].join(" ")
    : "This result applies only to the supplied sample inputs. Verify real device responses before relying on a routine.";

  return {
    status: statusBySeverity[highestSeverity],
    tone: highestSeverity,
    title: titleBySeverity[highestSeverity],
    description: descriptionBySeverity[highestSeverity],
    evidence,
    recommendation,
    findings,
  };
}

export function createDemoScenario(scenario) {
  const devices = [
    {
      id: "living-room-light",
      label: "Living-room light",
      status: "online",
    },
    {
      id: "robot-vacuum",
      label: "Robot vacuum",
      status: "online",
    },
    {
      id: "desk-plug",
      label: "Desk smart plug",
      status: "online",
    },
  ];

  const routine = {
    id: "evening-reset",
    name: "Evening Reset",
    steps: [
      {
        id: "light-off",
        label: "Turn living-room light off",
        deviceId: "living-room-light",
        action: "off",
        schedule: {
          startMinute: 19 * 60 + 30,
          endMinute: 19 * 60 + 35,
        },
      },
      {
        id: "vacuum-start",
        label: "Start robot vacuum",
        deviceId: "robot-vacuum",
        action: "start",
        schedule: {
          startMinute: 19 * 60 + 30,
          endMinute: 20 * 60,
        },
      },
      {
        id: "plug-off",
        label: "Turn desk plug off",
        deviceId: "desk-plug",
        action: "off",
        schedule: {
          startMinute: 19 * 60 + 30,
          endMinute: 19 * 60 + 35,
        },
      },
    ],
  };

  const otherRoutines = [
    {
      id: "focus-time",
      name: "Focus Time",
      steps: [
        {
          id: "focus-light-on",
          label: "Keep living-room light on",
          deviceId: "living-room-light",
          action: "on",
          schedule: {
            startMinute: 14 * 60,
            endMinute: 14 * 60 + 30,
          },
        },
      ],
    },
  ];

  const sensorReadings = [
    {
      sensorId: "hallway-smoke-sensor",
      label: "Hallway smoke sensor",
      status: "online",
      value: "sample-reading",
      updatedMinutesAgo: 1,
    },
  ];

  if (scenario === "offline") {
    devices.find(
      (device) => device.id === "robot-vacuum",
    ).status = "offline";
  } else if (scenario === "conflict") {
    otherRoutines[0].steps[0].schedule = {
      startMinute: 19 * 60 + 25,
      endMinute: 19 * 60 + 45,
    };
  } else if (scenario === "missing") {
    sensorReadings[0].status = "offline";
    sensorReadings[0].value = null;
    sensorReadings[0].updatedMinutesAgo = null;
  } else if (scenario !== "clear") {
    throw new Error(`Unsupported demo scenario: ${scenario}`);
  }

  return {
    routine,
    devices,
    otherRoutines,
    requiredSensorIds: ["hallway-smoke-sensor"],
    sensorReadings,
  };
}