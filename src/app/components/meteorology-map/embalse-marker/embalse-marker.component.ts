import {
  Component, OnInit, OnDestroy,
  Input, OnChanges, SimpleChanges,
  ChangeDetectionStrategy
} from '@angular/core';
import * as L from 'leaflet';
import { ReservoirData, createReservoirIcon, buildReservoirPopup } from './embalse-icon.utils';

@Component({
  selector: 'app-embalse-marker',
  standalone: true,           // ← añadir
  templateUrl: './embalse-marker.component.html',
  styleUrls: ['./embalse-marker.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EmbalseMarkerComponent implements OnInit {

  @Input() map!: L.Map;
  @Input() reservoirs: ReservoirData[] = [];
  @Input() iconSize: number = 44;

  private layerGroup: L.LayerGroup | null = null;

  constructor() { }

  ngOnInit(): void {
    if (this.map) {
      this.layerGroup = L.layerGroup().addTo(this.map);
      this.renderMarkers();
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    // Re-render whenever reservoir data or icon size changes
    if ((changes['reservoirs'] || changes['iconSize']) && this.layerGroup) {
      this.renderMarkers();
    }
  }

  ngOnDestroy(): void {
    this.layerGroup?.clearLayers();
    this.layerGroup?.remove();
  }

  private renderMarkers(): void {
    if (!this.layerGroup) return;
    this.layerGroup.clearLayers();

    for (const reservoir of this.reservoirs) {
      const icon   = createReservoirIcon(reservoir, this.iconSize);
      const marker = L.marker([reservoir.lat, reservoir.lng], { icon });

      marker.bindPopup(buildReservoirPopup(reservoir), {
        maxWidth: 260,
        className: 'reservoir-popup',   // target in global CSS to override Leaflet defaults
      });

      // Optional: open popup on hover too
      marker.on('mouseover', () => marker.openPopup());

      marker.addTo(this.layerGroup);
    }
  }


}
