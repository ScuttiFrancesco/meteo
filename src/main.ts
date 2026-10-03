import { bootstrapApplication } from '@angular/platform-browser';
import { provideZonelessChangeDetection } from '@angular/core';
import { appConfig } from './app/app.config';
import { ISettings } from './app/models/ISettings';
import { AppConfig } from './app/app-config-token';
import { registerLocaleData } from '@angular/common';
import localeIt from '@angular/common/locales/it';
import localeItExtra from '@angular/common/locales/extra/it';
import { AppComponent } from './app/app.component';



const _configFilePath = 'assets/config/app-config.json';
 
fetch(_configFilePath)
  .then((_response) => _response.json())
  .then((_config: ISettings) => {   
    appConfig.providers.push(
      { provide: AppConfig, useValue: _config },
      provideZonelessChangeDetection()
    );
    registerLocaleData(localeIt, 'it-IT', localeItExtra);
    bootstrapApplication(AppComponent, appConfig).catch((err) =>
      console.error(err)
    );
  })
  .catch((_error) =>
    console.error(`Errore nel recupero del file ${_configFilePath} `, _error)
  );
