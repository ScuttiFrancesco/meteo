import { InjectionToken } from '@angular/core';
import { ISettings } from './models/ISettings';
 
export const AppConfig = new InjectionToken<ISettings>('AppConfig');