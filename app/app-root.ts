import { EventData, View } from '@nativescript/core';
import { TrackerViewModel } from './tracker-view-model';

export function onLoaded(args: EventData) {
  const view = args.object as View;
  if (!view.bindingContext) view.bindingContext = new TrackerViewModel();
}
