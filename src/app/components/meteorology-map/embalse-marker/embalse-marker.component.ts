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

  public embalseLayerGroup: L.LayerGroup | null = null;
  private zoomListener: any;

  constructor() { }

  ngOnInit(): void {
    if (this.map) {
      this.embalseLayerGroup = L.layerGroup().addTo(this.map);
      this.renderMarkers();

      this.zoomListener = () => this.renderMarkers();
      this.map.on('zoomend', this.zoomListener);
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    // Re-render whenever reservoir data or icon size changes
    if ((changes['reservoirs'] || changes['iconSize']) && this.embalseLayerGroup) {
      this.renderMarkers();
    }
  }

  public getIconSize(): number {
    const zoom = this.map.getZoom();
    if (zoom <= 6) return 8;
    if (zoom <= 7) return 12;
    if (zoom <= 8) return 15;
    if (zoom <= 9) return 22;
    if (zoom <= 10) return 35;
    if (zoom <= 11) return 48;
    return 55;
  }

  ngOnDestroy(): void {
    if (this.map && this.zoomListener) {
      this.map.off('zoomend', this.zoomListener);
    }
    this.embalseLayerGroup?.clearLayers();
    this.embalseLayerGroup?.remove();
  }

  public renderMarkers(): void {
    if (!this.embalseLayerGroup) return;
    this.embalseLayerGroup.clearLayers();

    const size = this.getIconSize();

    for (const reservoir of this.reservoirs) {
      const icon   = createReservoirIcon(reservoir, size);
      const marker = L.marker([reservoir.lat, reservoir.lng], { icon });

      marker.bindPopup(buildReservoirPopup(reservoir), {
        maxWidth: 260,
        className: 'reservoir-popup',   // target in global CSS to override Leaflet defaults
      });

      // Optional: open popup on hover too
      marker.on('onclick', () => marker.openPopup());

      marker.addTo(this.embalseLayerGroup);
    }
  }


}
