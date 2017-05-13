import React from 'react';
import styles from "../style.css";
import { Bond,TimeBond } from 'oo7';
import { TextBond, Rspan, Hash, HashBond, Rimg, RRaisedButton, ReactiveComponent} from 'oo7-react';
import { TransactionProgress, TransactionProgressBadge, AccountIcon } from 'parity-reactive-ui';
// parity-reactive-ui
// Balance (display the reactive prop value);
// BlockNumber (display the reactive prop value);
// AccountIcon (display the account icon for the reactive prop address);
// Account (display the account icon and name for the reactive prop address);
// RichAccount (display the account icon, name and balance for the reactive prop address);
// TransactionProgress (display the progress of a transaction; reactive prop is request and should be of type Transaction);
import { formatBlockNumber, formatBalance, isNullData } from 'oo7-parity';

// ABI of our contract
const CounterABI = [{"constant":false,"inputs":[{"name":"_option","type":"uint256"}],"name":"vote","outputs":[],"payable":false,"type":"function"},
										{"constant":true,"inputs":[{"name":"","type":"address"}],"name":"hasVoted","outputs":[{"name":"","type":"bool"}],"payable":false,"type":"function"},
										{"constant":true,"inputs":[{"name":"","type":"uint256"}],"name":"votes","outputs":[{"name":"","type":"uint256"}],"payable":false,"type":"function"},
										{"anonymous":false,"inputs":[{"indexed":true,"name":"who","type":"address"},{"indexed":true,"name":"option","type":"uint256"}],"name":"Voted","type":"event"}];

const CounterCode = '\
0x6060604052341561000c57fe5b5b6102758061001c6000396000f30060606040526000357c0100000000000000000000000000000000000000000000000000000000900463ffffffff1680630121b93f1461005157806309eef43e146100715780635df81330146100bf575bfe5b341561005957fe5b61006f60048080359060200190919050506100f3565b005b341561007957fe5b6100a5600480803573ffffffffffffffffffffffffffffffffffffffff16906020019091905050610211565b604051808215151515815260200191505060405180910390f35b34156100c757fe5b6100dd6004808035906020019091905050610231565b6040518082815260200191505060405180910390f35b600160003373ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff16815260200190815260200160002060009054906101000a900460ff161561014b5760006000fd5b60006000828152602001908152602001600020600081548092919060010191905055506001600160003373ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff16815260200190815260200160002060006101000a81548160ff021916908315150217905550803373ffffffffffffffffffffffffffffffffffffffff167f4d99b957a2bc29a30ebd96a7be8e68fe50a3c701db28a91436490b7d53870ca460405180905060405180910390a35b50565b60016020528060005260406000206000915054906101000a900460ff1681565b600060205280600052604060002060009150905054815600a165627a7a72305820fd691104d6920154a56ae13cfe323495057bbda43f2d8b8ee5165f624e96c69a0029';

const Options = ['RED', 'GREEN', 'BLUE'];

const node1 = '0x00Aa39d30F0D20FF03a22cCfc30B7EfbFca597C2';

const CounterCodeHash = '0x10d2b44a953ecf30231a87c541df5d640b43a30d8ec9a6ed95e411675d8aff42';



export class App extends React.Component {
	constructor () {
		super();
		this.addr = new Bond;
		this.addr.then(v => {
			window.localStorage.counter = v;
			let counter = parity.bonds.makeContract(v, CounterABI);
			this.setState({ tx: null, counter });
		});
		//this.state = { counter: parity.bonds.makeContract('0x6a0386F4044DAB9fd45Fd58b5B0C3d924626DCc6', CounterABI) }; -- devChain
		//this.state = { counter: parity.bonds.makeContract('0x7BA4324585CB5597adC283024819254345CD7C62', CounterABI) }; --treeHackChain
		this.state = { tx: null, counter: window.localStorage.counter
									? parity.bonds.makeContract(window.localStorage.counter, CounterABI)
									: null };
		this.deploy = this.deploy.bind(this);
	}

	deploy () {
		let tx = parity.bonds.deployContract(CounterCode, CounterABI);
		this.setState({tx});
		tx.done(s => {
			this.setState({ counter: s.deployed });
			window.localStorage.counter = s.deployed.address;
		});
	}

	render () {
		return (<div>
			{!!this.state.counter
				? <Counter contract={this.state.counter} />
				: <div>
					<RRaisedButton label='Deploy' onClick={this.deploy}/>
					<TransactionProgressBadge value={this.state.tx}/>
				</div>
			}
			<span style={{margin: '2em'}}>OR</span>
			<TextBond bond={this.addr} validator={v => v.startsWith('0x') && v.length == 42 && parity.bonds.code(v).map(_ => parity.api.util.sha3(_) == CounterCodeHash)}/>
		</div>);
	}
}

class Counter extends React.Component {
	constructor() {
		super();
		this.state = { tx: null };
	}
	componentWillMount () { this.componentWillReceiveProps(this.props); }
	componentWillReceiveProps (props) {
		this.voted = this.props.contract.hasVoted(parity.bonds.me);
		this.prevVote = this.props.contract.Voted({ who: parity.bonds.me });
		this.prevVotes = this.props.contract.Voted({ who: parity.bonds.accounts });
	}

	render(){
		var votingEnabled = Bond.all([this.voted, this.state.tx]).map(([v, t]) => !v && (!t || !!t.failed));
		console.log(votingEnabled);
		return (
			<div>
				Voting contract on TreeHack
				<div>
					{Options.map((n, i) => (
					<div key={i}>
						<VoteOption label={n} votes={this.props.contract.votes(i)} vote={() => this.setState({tx: this.props.contract.vote(i)})}  enabled={votingEnabled}></VoteOption>
					</div>))}
					<div style={{marginTop: '1em'}}>
						<TransactionProgressBadge value={this.state.tx}/>
					</div>
				</div>
				<br />
				Previous Vote:
				<Rspan>{this.prevVote.map(v => v.length > 0 ? `Already voted for ${Options[v[0].option]}` : '')}</Rspan>
				<div style={{fontSize: 'small'}}>
					Using contract at {this.props.contract.address}.
				</div>
			</div>

		);
	}
}

class VoteOption extends ReactiveComponent {
	constructor() {
		// by putting it into the super constructor - state is able to be bond value
		super(['votes'], ['enabled']);
	}
	render(){
		// disable link when vote is processing
		var s = {float: 'left', minWidth: '3em'};
		if (!this.state.enabled) s.cursor = 'not-allowed';
		// return vote options
		return (
			<span style={{ borderLeft:`${1 + this.state.votes * 10}px black solid` }}>
				<a style={s}
					 href='#'
					 onClick={ this.props.vote}>
					{this.props.label}
				</a>
			</span>
		)
	}
}
//
// class VoteOption extends ReactiveComponent {
// 	constructor () {
// 		super(['votes']);
// 	}
// 	readyRender () {
// 		return (<span style={{ borderLeft:
// 			`${1 + this.state.votes * 10}px black solid` }}>
// 			<a
// 				style={{float: 'left', minWidth: '3em'}}
// 				href='#'
// 				onClick={this.props.vote}>
// 					{this.props.label}
// 			</a>
// 		</span>);
// 	}
// }


// Before Refractoring
// class VoteOption extends ReactiveComponent {
// 	constructor() {
// 		// by putting it into the super constructor - state is able to be bond value
// 		super(['votes'], ['enabled']);
// 	}
// 	readyRender(){
// 		// disable link when vote is processing
// 		var s = {float: 'left', minWidth: '3em'};
// 		if (!this.state.enabled) s.cursor = 'not-allowed';
// 		// return vote options
// 		return (
// 			<span style={{ borderLeft:`${1 + this.state.votes * 10}px black solid` }}>
// 				<a style={s}
// 					 href='#'
// 					 onClick={this.state.enabled && this.props.vote}>
// 					{this.props.label}
// 				</a>
// 			</span>
// 		)
// 	}
// }
//
// class Counter extends React.Component {
// 	constructor() {
// 		super();
// 		this.state = { tx: null };
// 	}
// 	componentWillMount () { this.componentWillReceiveProps(this.props); }
// 	componentWillReceiveProps (props) {
// 		this.recipient = node1;// parity.bonds.registry.lookupAddress(this.name, 'A');
// 		this.name = new Bond;
// 		this.state = {
// 			current: null,
// 			tx: null,
// 		};
// 		this.voted = this.props.contract.hasVoted(parity.bonds.me);
// 		// event of previous vote => filtered by indexed "who" => only Voted event for the address of the current user
// 		this.prevVote = this.props.contract.Voted({ who: parity.bonds.me });
// 		this.prevVotes = this.props.contract.Voted({ who: parity.bonds.accounts });
// 	}
// 	// save state of transaction to display processing:
// 	// {"requested": id}, {"signed": hash}, {"confirmed": receipt}, {"failed": error}
// 	give(){
// 		this.setState({
// 			current: parity.bonds.post({
// 				to: this.recipient,
// 				value: 100 * 1e15,
// 			}),
// 		})
// 	}
//
// 	render(){
// 		var votingEnabled = Bond.all([this.voted, this.state.tx]).map(([v, t]) => !v && (!t || !!t.failed));
//
// 		return (
// 			<div>
// 				My balance: <Rspan>
// 					{parity.bonds.balance(parity.bonds.me).map(formatBalance)}
// 				</Rspan>
// 				<br />
// 				<TextBond bond={this.name} floatingLabelText='Name of recipient' />
// 				<RRaisedButton
// 					//label={this.name.map(n => `Give ${n} 100 Finney`)}
// 					label={'Give Node1 100 Finney'}
// 					//disabled={this.recipient.map(isNullData)}
// 					onClick={this.give.bind(this)}
// 				/>
// 				<Rspan>{this.state.current && this.state.current.map(JSON.stringify)}</Rspan>
// 				<TransactionProgress request={this.state.current}></TransactionProgress>
// 				<br />
// 				<br />
// 				Voting contract
// 				<div>
// 					{Options.map((n, i) => (
// 					<div key={i}>
// 						<VoteOption label={n} votes={this.props.contract.votes(i)} vote={() => this.setState({tx: this.props.contract.vote(i)})} enabled={votingEnabled}></VoteOption>
// 					</div>))}
// 					<div style={{marginTop: '1em'}}>
// 						<TransactionProgressBadge value={this.state.tx}/>
// 					</div>
// 				</div>
// 				<br />
// 				Previous Vote:
// 				<Rspan>{this.prevVote.map(v => v.length > 0 ? `Already voted for ${Options[v[0].option]}` : '')}</Rspan>
//
// 			</div>
// 		)
// 	}
// }


// Contract Calls - Inspect contracts
// export class App extends React.Component {
// constructor(){
// 	super();
// 	this.bond = new Bond;
// 	this.hash = new Bond;
// 	// GithubHint = Semi-centralized contant address system - give it a HASH get back either URL or github/commit
// 	this.GithubHint = parity.bonds.makeContract(parity.bonds.registry.lookupAddress('githubhint', 'A'), parity.api.abi.githubhint);
// }
//
// 	render() {
// 		return (
// 			// getAddress would need the associated primary address: could get it with parity.api.util.sha3('gavofyork')
// 			<div>
// 				Address of <TextBond bond={this.bond} floatingLabelText="Look up a name" /> is: <br />
// 				<Hash value={parity.bonds.registry.lookupAddress(this.bond, 'A')}></Hash>, it's balance is &nbsp;
// 				<Rspan>
// 					{parity.bonds.balance(parity.bonds.registry.lookupAddress(this.bond, 'A')).map(formatBalance)}
// 				</Rspan>
// 				The IMG Hash is: <Hash value={parity.bonds.registry.lookupData(this.bond, 'IMG')}></Hash>
// 				<Rimg src={this.GithubHint.entries(parity.bonds.registry.lookupData(this.bond, 'IMG'))[0]} />
// 				<br />
// 				<br />
// 				<h1>GithubHint</h1>
// 				URL for content: <HashBond bond={this.hash} floatingLabelText="Content Hash" /> <br />
// 				<Rspan>{this.GithubHint.entries(this.hash)[0]}</Rspan>
// 				<br />
// 				IMG
// 				<div>
// 					<TextBond bond={this.bond} floatingLabelText='Name' />
// 					<Rimg src={this.GithubHint.entries(parity.bonds.registry.lookupData(this.bond, 'IMG'))[0]} />
// 				</div>
// 			</div>
//
// 		)
// 	}
// }


// Parity Bonds
// export class App extends React.Component {
// 	render() {
// 		return (
// 			<div>
// 				Latest block's timestamp is: &nbsp;
// 				<Rspan style={{fontWeight: 'bold'}}>
// 					{parity.bonds.head.timestamp.map(_ => _.toString())}
// 				</Rspan>
// 				<br /> <br />
// 				Current block author's balance is:&nbsp;
// 				<Rspan style={{fontWeight: 'bold'}}>
// 					{parity.bonds.balance(parity.bonds.head.author).map(formatBalance)}
// 				</Rspan>
// 				<br /> <br />
// 				Accounts available:&nbsp;
// 				<Rspan>
// 					{parity.bonds.accounts.map(_=>_.join(", "))}
// 				</Rspan>
// 				<br /> <br />
// 				Default account:&nbsp;
// 				<Hash value={parity.bonds.me}></Hash>
// 				&nbsp;
// 				<Rspan>
// 					{parity.bonds.accountInfo[parity.bonds.me].name}
// 				</Rspan>
// 				<br />
// 				With the balance of:&bnsp;
// 				<Rspan>
// 					{parity.bonds.balance(parity.bonds.me).map(formatBalance)}
// 				</Rspan>
// 			</div>
// 		);
// 	}
// }



// Bonds
// const compuateColor = t => t.match(/^[0-9]+$/) ? {color:'red'} : {color:'green'}
// const format = ([msg, t]) => `${new Date(t)} : ${msg}`
//
// export class App extends React.Component {
// 	constructor() {
// 		super();
// 		this.bond = new Bond();
// 		this.time = new TimeBond();
// 	}
//
// 	render() {
// 		return (
// 			<div>
// 				<TextBond
// 					bond={this.bond}
// 					floatingLabelText="Go write something!">
// 				</TextBond>
// 				<Rspan style={this.bond.map(compuateColor)}>
// 					{Bond.all([this.bond, this.time]).map(format)}
// 				</Rspan>
// 			</div>
// 	);
// 	}
// }
