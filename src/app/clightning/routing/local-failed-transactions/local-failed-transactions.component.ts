import { Component, OnInit, ViewChild, OnDestroy, AfterViewInit } from '@angular/core';
import { Router } from '@angular/router';
import { DatePipe } from '@angular/common';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { Store } from '@ngrx/store';
import { MatPaginator, MatPaginatorIntl } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { MatTableDataSource } from '@angular/material/table';

import { LocalFailedEvent } from '../../../shared/models/clModels';
import { PAGE_SIZE, PAGE_SIZE_OPTIONS, getPaginatorLabel, AlertTypeEnum, DataTypeEnum, ScreenSizeEnum, APICallStatusEnum, CLFailReason } from '../../../shared/services/consts-enums-functions';
import { ApiCallStatusPayload } from '../../../shared/models/apiCallsPayload';
import { LoggerService } from '../../../shared/services/logger.service';
import { CommonService } from '../../../shared/services/common.service';

import { RTLState } from '../../../store/rtl.state';
import { openAlert } from '../../../store/rtl.actions';
import { getLocalFailedForwardingHistory } from '../../store/cl.actions';
import { localFailedForwardingHistory } from '../../store/cl.selector';

@Component({
  selector: 'rtl-cl-local-failed-history',
  templateUrl: './local-failed-transactions.component.html',
  styleUrls: ['./local-failed-transactions.component.scss'],
  providers: [
    { provide: MatPaginatorIntl, useValue: getPaginatorLabel('Local Failed Events') }
  ]
})
export class CLLocalFailedTransactionsComponent implements OnInit, AfterViewInit, OnDestroy {

  @ViewChild(MatSort, { static: false }) sort: MatSort | undefined;
  @ViewChild(MatPaginator, { static: false }) paginator: MatPaginator | undefined;
  public CLFailReason = CLFailReason;
  public failedLocalEvents: any;
  public errorMessage = '';
  public displayedColumns: any[] = [];
  public failedLocalForwardingEvents: any;
  public flgSticky = false;
  public selFilter = '';
  public pageSize = PAGE_SIZE;
  public pageSizeOptions = PAGE_SIZE_OPTIONS;
  public screenSize = '';
  public screenSizeEnum = ScreenSizeEnum;
  public apiCallStatus: ApiCallStatusPayload = null;
  public apiCallStatusEnum = APICallStatusEnum;
  private unSubs: Array<Subject<void>> = [new Subject(), new Subject(), new Subject()];

  constructor(private logger: LoggerService, private commonService: CommonService, private store: Store<RTLState>, private datePipe: DatePipe, private router: Router) {
    this.screenSize = this.commonService.getScreenSize();
    if (this.screenSize === ScreenSizeEnum.XS) {
      this.flgSticky = false;
      this.displayedColumns = ['received_time', 'in_channel', 'in_msatoshi', 'actions'];
    } else if (this.screenSize === ScreenSizeEnum.SM || this.screenSize === ScreenSizeEnum.MD) {
      this.flgSticky = false;
      this.displayedColumns = ['received_time', 'in_channel', 'in_msatoshi', 'actions'];
    } else {
      this.flgSticky = true;
      this.displayedColumns = ['received_time', 'in_channel', 'in_msatoshi', 'failreason', 'actions'];
    }
  }

  ngOnInit() {
    this.router.routeReuseStrategy.shouldReuseRoute = () => false;
    this.router.onSameUrlNavigation = 'reload';
    this.store.dispatch(getLocalFailedForwardingHistory());
    this.store.select(localFailedForwardingHistory).pipe(takeUntil(this.unSubs[0])).
      subscribe((lffhSeletor: { localFailedForwardingHistory: LocalFailedEvent[], apiCallStatus: ApiCallStatusPayload }) => {
        this.errorMessage = '';
        this.apiCallStatus = lffhSeletor.apiCallStatus;
        if (this.apiCallStatus.status === APICallStatusEnum.ERROR) {
          this.errorMessage = (typeof (this.apiCallStatus.message) === 'object') ? JSON.stringify(this.apiCallStatus.message) : this.apiCallStatus.message;
        }
        this.failedLocalEvents = lffhSeletor.localFailedForwardingHistory || [];
        if (this.failedLocalEvents.length > 0 && this.sort && this.paginator) {
          this.loadLocalfailedLocalEventsTable(this.failedLocalEvents);
        }
        this.logger.info(lffhSeletor);
      });
  }

  ngAfterViewInit() {
    if (this.failedLocalEvents.length > 0) {
      this.loadLocalfailedLocalEventsTable(this.failedLocalEvents);
    }
  }

  onFailedLocalEventClick(selFEvent: LocalFailedEvent) {
    const reorderedFHEvent = [
      [{ key: 'received_time', value: selFEvent.received_time, title: 'Received Time', width: 50, type: DataTypeEnum.DATE_TIME },
      { key: 'in_channel_alias', value: selFEvent.in_channel_alias, title: 'Inbound Channel', width: 50, type: DataTypeEnum.STRING }],
      [{ key: 'in_msatoshi', value: selFEvent.in_msatoshi, title: 'Amount In (mSats)', width: 100, type: DataTypeEnum.NUMBER }],
      [{ key: 'failreason', value: this.CLFailReason[selFEvent.failreason], title: 'Reason for Failure', width: 100, type: DataTypeEnum.STRING }]
    ];
    this.store.dispatch(openAlert({
      payload: {
        data: {
          type: AlertTypeEnum.INFORMATION,
          alertTitle: 'Local Failed Event Information',
          message: reorderedFHEvent
        }
      }
    }));
  }

  loadLocalfailedLocalEventsTable(forwardingEvents: LocalFailedEvent[]) {
    this.failedLocalForwardingEvents = new MatTableDataSource<LocalFailedEvent>([...forwardingEvents]);
    this.failedLocalForwardingEvents.filterPredicate = (event: LocalFailedEvent, fltr: string) => {
      const newEvent = ((event.received_time ? this.datePipe.transform(new Date(event.received_time * 1000), 'dd/MMM/YYYY HH:mm').toLowerCase() : '') +
        (event.in_channel_alias ? event.in_channel_alias.toLowerCase() : '') +
        ((event.failreason && this.CLFailReason[event.failreason]) ? this.CLFailReason[event.failreason].toLowerCase() : '') +
        (event.in_msatoshi ? (event.in_msatoshi / 1000) : ''));
      return newEvent.includes(fltr);
    };
    this.failedLocalForwardingEvents.sort = this.sort;
    this.failedLocalForwardingEvents.sortingDataAccessor = (data: LocalFailedEvent, sortHeaderId: string) => {
      switch (sortHeaderId) {
        case 'failreason':
          return this.CLFailReason[data.failreason];

        default:
          return (data[sortHeaderId] && isNaN(data[sortHeaderId])) ? data[sortHeaderId].toLocaleLowerCase() : data[sortHeaderId] ? +data[sortHeaderId] : null;
      }
    };
    this.failedLocalForwardingEvents.paginator = this.paginator;
    this.applyFilter();
    this.logger.info(this.failedLocalForwardingEvents);
  }

  onDownloadCSV() {
    if (this.failedLocalForwardingEvents && this.failedLocalForwardingEvents.data && this.failedLocalForwardingEvents.data.length > 0) {
      this.commonService.downloadFile(this.failedLocalForwardingEvents.data, 'Local-failed-transactions');
    }
  }

  applyFilter() {
    this.failedLocalForwardingEvents.filter = this.selFilter.trim().toLowerCase();
  }

  ngOnDestroy() {
    this.unSubs.forEach((completeSub) => {
      completeSub.next(null);
      completeSub.complete();
    });
  }

}
