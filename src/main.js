import * as THREE from 'three'
import { Engine } from './Engine'
import { HomeScene } from './scenes/HomeScene'

const engine = new Engine()

const homeScene = new HomeScene()

engine.register('home', homeScene)
