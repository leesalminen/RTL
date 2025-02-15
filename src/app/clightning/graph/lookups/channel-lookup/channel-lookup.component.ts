import { Component, OnInit, Input } from '@angular/core';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { Store } from '@ngrx/store';

import { ChannelEdge, GetInfo } from '../../../../shared/models/clModels';
import { RTLState } from '../../../../store/rtl.state';
import { clNodeInformation } from '../../../store/cl.selector';

@Component({
  selector: 'rtl-cl-channel-lookup',
  templateUrl: './channel-lookup.component.html',
  styleUrls: ['./channel-lookup.component.scss']
})
export class CLChannelLookupComponent implements OnInit {

  @Input() lookupResult: ChannelEdge[] = [];
  public node1_match = false;
  public node2_match = false;
  private unSubs: Array<Subject<void>> = [new Subject(), new Subject(), new Subject(), new Subject()];

  constructor(private store: Store<RTLState>) { }

  ngOnInit() {
    this.store.select(clNodeInformation).pipe(takeUntil(this.unSubs[0])).
      subscribe((nodeInfo: GetInfo) => {
        if (this.lookupResult.length > 0 && this.lookupResult[0].source === nodeInfo.id) {
          this.node1_match = true;
        }
        if (this.lookupResult.length > 1 && this.lookupResult[1].source === nodeInfo.id) {
          this.node2_match = true;
        }
      });
  }

}
