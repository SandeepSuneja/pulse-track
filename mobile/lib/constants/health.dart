const healthActivityWeightLifting = 'weight_lifting';
const healthActivityCardio = 'cardio';

const healthCardioWalkingRunning = 'walking_running';
const healthCardioCycling = 'cycling';
const healthCardioSwimming = 'swimming';

const healthActivityOptions = [
  (id: healthActivityWeightLifting, label: 'Weight lifting'),
  (id: healthActivityCardio, label: 'Cardio'),
];

const healthCardioOptions = [
  (id: healthCardioWalkingRunning, label: 'Walking or running'),
  (id: healthCardioCycling, label: 'Cycling'),
  (id: healthCardioSwimming, label: 'Swimming'),
];

String healthActivityLabel(String? id) {
  for (final o in healthActivityOptions) {
    if (o.id == id) return o.label;
  }
  return id ?? '';
}

String healthCardioLabel(String? id) {
  for (final o in healthCardioOptions) {
    if (o.id == id) return o.label;
  }
  return id ?? '';
}
