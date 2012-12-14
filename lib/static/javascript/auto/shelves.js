//
// EPrints Services/sf2
//
// EPJS_Shelves: Shelves Manager on Searches
//

// Shelves handler on abstract pages 
var EPJS_Shelves_Workflow = Class.create({

   container_id: null,
   eprint_id: null,
   in_shelves: null,
   search_in_progress: false,

  // PUBLIC FUNCTIONS

  // constructor
  initialize: function(params) {

	if( params == null )
		params = {};

	this.container_id = params.container_id;
	if( this.container_id == null )
		this.container_id = 'shelves';

	this.eprint_id = params.eprint_id;
	if( this.eprint_id == null )
	{
		alert( "Shelves: missing eprint_id param" );
		return;
	}

	this.__initContainers();

	this.showAvailableShelves();
  },

  __autoSearchShelves: function(event) {

	if( this.search_in_progress )
		return false;

	var value = $( 'shelves_component_input' ).value;

        if( value == null || value.length == 0 )
                return false;
	
	this.searchShelves();
  },
 
  searchShelves: function(event) {

	if( event != null )
		Event.stop(event);

	this.__clearAvailableShelves();

	var value = $( 'shelves_component_input' ).value;

//	if( value == null || value.length == 0 )
//		return false;

	if( value == null || value.length < 3 )
	{
		this.__addMessage( 'Search needs to be 3 characters or more.' );
		return false;
	}
	
	this.search_in_progress = true;
	
	this.__clearMessages();	

        new Ajax.Request( '/cgi/shelves/search?eprintid='+this.eprint_id+'&q='+value+'&t='+new Date().getTime(), {
                method: 'get',
                onSuccess: function(transport) {

                        var json = this.__getJSON(transport);
                        if( json != null )
                        {
				this.search_in_progress = false;
                                var error = json.error;
                                if( error != null )
                                {
                                        this.__addMessage( error );
                                        return false;
                                }

				var shelves = json.shelves;

				if( shelves == null || shelves.length == 0 )
				{
					this.__addMessage( 'No results.' );
			                return false;
				}

				var contentEl = $( 'shelves_available' );
				for( var i=0; i<shelves.length; i++ )
				{
					var shelf = shelves[i];
					var id = shelf.id;
					var title = shelf.title;
					var shelf_el = this.__buildShelfElement(shelf);
					if( shelf_el != null )
						contentEl.appendChild( shelf_el );

				}
                        }
                        return false;
                }.bind(this)
        });
  },

  viewAllShelves: function(event) {

	$( 'shelves_component_input' ).value = '';	
	this.showAvailableShelves(event);
  },
 
  // loads available shelves to the current user
  showAvailableShelves: function(event) {

	if( event != null )
		Event.stop(event);

	this.__clearMessages();

	new Ajax.Request( '/cgi/shelves/show_all_with_eprint?eprintid='+this.eprint_id+'&t='+new Date().getTime(), {
		method: 'get',
		onSuccess: function(transport) {

			var json = transport.responseText.evalJSON();
        	        if( json != null )
                	{
				this.__clearAvailableShelves();
				var error = json.error;
				if( error != null )
				{
					this.__addMessage( error );
				}
				else
				{
					var shelves = json.shelves;
					var contentEl = $( 'shelves_available' );
					for( var i=0; i<shelves.length; i++ )
					{
						var shelf = shelves[i];
						var id = shelf.id;
						var title = shelf.title;
						var shelf_el = this.__buildShelfElement(shelf);
						if( shelf_el != null )
							contentEl.appendChild( shelf_el );

					}
					contentEl.appear();
				}
			}
		}.bind(this)	// end of onSuccess
	});

	return false;
  },
  __getJSON: function(transport) {

	if( transport == null )
		return null;

	if( transport.responseText == null || transport.responseText == '' )
		return null;

	return transport.responseText.evalJSON();
  },
  
  // internal function that properly stops the onclick event
  __boundAddToShelf: function(event) {

	Event.stop(event);
	var data = $A(arguments);
	var shelfid = data[1];
	
	new Ajax.Request( '/cgi/shelves/add?shelfid='+shelfid+'&eprintids='+this.eprint_id+'&t='+new Date().getTime(), {
		method: 'get',
		onSuccess: function(transport) {

			var json = this.__getJSON(transport);
			if( json != null )
			{
				var error = json.error;
				if( error != null )
				{
					this.__addMessage( error );
					return false;
				}
			}

			this.toggleActionButton( shelfid );
			return false;
		}.bind(this)
	});

	return false;

  },
  
  toggleActionButton: function(shelfid) {

	var el = $( 'shelf_link_'+shelfid );

	if( el == null )
		return false;
	var type = el.getAttribute( 'link_type' );
	if( type == null )
		return false;
		
	var parentEl = el.parentNode;

	if( type == 'add' )
	{
		el.remove();
                var remove = new Element( 'a', { 'href': '#', 'class': 'epjs_shelves_workflow_remove' } );
                remove.id = "shelf_link_"+shelfid;
                remove.setAttribute( 'link_type' , 'remove');
                parentEl.appendChild( remove );

		var img = new Element( 'img', { 'src': '/style/images/remove_from_shelf.png', 'alt': 'remove from shelf' } );
		remove.appendChild( img );

                Event.observe( remove, 'click', this.__boundRemoveFromShelf.bindAsEventListener(this, shelfid) );
	}
	else if( type == 'remove' )
	{
		el.remove();
		var add = new Element( 'a', { 'href': '#', 'class': 'epjs_shelves_workflow_add' } );
		add.id = "shelf_link_"+shelfid;
		add.setAttribute( 'link_type' , 'add' );
		parentEl.appendChild( add );

		var img = new Element( 'img', { 'src': '/style/images/add_to_shelf.png', 'alt': 'add to shelf' } );
		add.appendChild( img );

		Event.observe( add, 'click', this.__boundAddToShelf.bindAsEventListener(this, shelfid) );
	}

	return true;
  },
  
  // hides the menu which shows the available shelves
  __clearAvailableShelves: function() {

	$$( 'div.epjs_shelves_shelf_select' ).each(function(el) { el.remove(); });
  },
	
  __boundRemoveFromShelf: function(event) {

	Event.stop(event);
	var data = $A(arguments);
	var shelfid = data[1];

	new Ajax.Request( '/cgi/shelves/remove?shelfid='+shelfid+'&eprintid='+this.eprint_id+'&t='+new Date().getTime(), {
		method: 'get',
		onSuccess: function(transport) {

			var json = this.__getJSON(transport);
			if( json != null )
			{
				var error = json.error;
				if( error != null )
				{
					this.__addMessage( error );
					return false;
				}
			}

			this.toggleActionButton( shelfid );
			return false;
		}.bind(this)
	});

	return false;
  },

  __buildShelfElement: function(shelf) {

	if( shelf.id == null )
		return null;
	
	var div = new Element( 'div', { 'class': 'epjs_shelves_shelf_select' } );
	var span = new Element( 'span' );
	div.appendChild( span );
	span.update( shelf.title );

	var ep_in_shelf = shelf.is_eprint;
	if( ep_in_shelf == '1' )
	{
		// add 'Remove' button
		var remove = new Element( 'a', { 'href': '#', 'class': 'epjs_shelves_workflow_remove' } );
		remove.id = "shelf_link_"+shelf.id;
		remove.setAttribute( 'link_type' , 'remove');
		div.appendChild( remove );

		var img = new Element( 'img', { 'src': '/style/images/remove_from_shelf.png', 'alt': 'remove from shelf' } );
		remove.appendChild( img );

		Event.observe( remove, 'click', this.__boundRemoveFromShelf.bindAsEventListener(this, shelf.id) );
	}
	else
	{
		// add 'Add' button
		var add = new Element( 'a', { 'href': '#', 'class': 'epjs_shelves_workflow_add' } );
		add.id = "shelf_link_"+shelf.id;
		add.setAttribute( 'link_type' , 'add' );
		div.appendChild( add );

		var img = new Element( 'img', { 'src': '/style/images/add_to_shelf.png', 'alt': 'add to shelf' } );
		add.appendChild( img );

		Event.observe( add, 'click', this.__boundAddToShelf.bindAsEventListener(this, shelf.id) );
	}
	
	return div;

  },
 
  __clearMessages: function() {

	$( 'shelves_messages' ).update( '' );
	$( 'shelves_messages' ).hide();
  },
 
  __addMessage: function(el) {

	$( 'shelves_messages' ).update(el);
	$( 'shelves_messages' ).appear();
  },
  
  // creates the HTML menus
  __initContainers: function() {

/* DOM Structure

<div id="shelves_component_searchbar">
	<span id="shelves_component_search_label">Search shelves:</span>
	<input id="shelves_component_input" class="ep_form_text"/>
	<input id="shelves_component_dosearch" class="ep_form_action_button"/>
	<input id="shelves_component_doviewall" class="ep_form_action_button"/>
</div>
<div style="display: none;" id="shelves_messages"/>
<div id="shelves_available"/>

*/

	var container = $( this.container_id );

	container.appendChild( Builder.node( 'div', {id: 'shelves_component_searchbar' }, [
		Builder.node( 'span', {id: 'shelves_component_search_label'} ),
		Builder.node( 'input', {id:'shelves_component_input', 'class':'ep_form_text', 'type':'text'} ),
		Builder.node( 'input', {id:'shelves_component_dosearch', 'class':'ep_form_action_button', 'type':'submit'} ),
		Builder.node( 'input', {id:'shelves_component_doviewall', 'class':'ep_form_action_button', 'type':'submit'} )
	] ) );

	container.appendChild( Builder.node( 'div', {id:'shelves_messages'} ) );
	container.appendChild( Builder.node( 'div', {id:'shelves_available'} ) );

	[ 'shelves_messages' ].each(function(name,idx) { $( name ).hide(); } );

	$( 'shelves_component_search_label' ).update( 'Search shelves:' );
	$( 'shelves_component_dosearch' ).value = 'Search';
	$( 'shelves_component_doviewall' ).value = 'Clear';

	Event.observe( $( 'shelves_component_dosearch' ), 'click', this.searchShelves.bindAsEventListener(this) );
	Event.observe( $( 'shelves_component_doviewall' ), 'click', this.viewAllShelves.bindAsEventListener(this) );

	var search_input = $( 'shelves_component_input' );

	// Run a search if the user hits Enter (eg. if the auto search doesn't work, for some reasons...
        Event.observe( search_input, 'keypress', function(event) { 
			if (event.keyCode == Event.KEY_RETURN) 
				return this.searchShelves(event);

			return false;
	}.bindAsEventListener(this));

	// Run the auto search as the user types
	Event.observe( search_input, 'keyup', function(event) {

			if (event.keyCode == Event.KEY_RETURN) 
				return false;

			this.__autoSearchShelves(event);
			return false;

	}.bindAsEventListener(this));

	return;
  }

});


// Shelves handler on abstract pages 
var EPJS_Shelves_AbstractPage = Class.create({

   container_id: null,
   eprint_id: null,
   in_shelves: null,

  // PUBLIC FUNCTIONS

  // constructor
  initialize: function(params) {

	if( params == null )
		params = {};

	this.container_id = params.container_id;
	if( this.container_id == null )
		this.container_id = 'shelves';

	this.eprint_id = params.eprint_id;
	if( this.eprint_id == null )
	{
		alert( "Shelves: missing eprint_id param" );
		return;
	}

	this.__initContainers();
  },
  
  // loads available shelves to the current user
  showAvailableShelves: function(event) {

	if( event != null )
		Event.stop(event);

	new Ajax.Request( '/cgi/shelves/show_all_with_eprint?eprintid='+this.eprint_id+'&t='+new Date().getTime(), {
		method: 'get',
		onSuccess: function(transport) {

			var json = transport.responseText.evalJSON();
        	        if( json != null )
                	{
				this.__clearAvailableShelves();
				var error = json.error;
				if( error != null )
				{
					this.__addMessage( error );
				}
				else
				{
					var shelves = json.shelves;
					var contentEl = $( 'shelves_available' );
					for( var i=0; i<shelves.length; i++ )
					{
						var shelf = shelves[i];
						var id = shelf.id;
						var title = shelf.title;
						var shelf_el = this.__buildShelfElement(shelf);
						if( shelf_el != null )
							contentEl.appendChild( shelf_el );

					}
					contentEl.appear();
				}
			}
		}.bind(this)	// end of onSuccess
	});

	return false;
  },
  __getJSON: function(transport) {

	if( transport == null )
		return null;

	if( transport.responseText == null || transport.responseText == '' )
		return null;

	return transport.responseText.evalJSON();
  },
  
  // internal function that properly stops the onclick event
  __boundAddToShelf: function(event) {

	Event.stop(event);
	var data = $A(arguments);
	var shelfid = data[1];
	
	new Ajax.Request( '/cgi/shelves/add?shelfid='+shelfid+'&eprintids='+this.eprint_id+'&t='+new Date().getTime(), {
		method: 'get',
		onSuccess: function(transport) {

			var json = this.__getJSON(transport);
			if( json != null )
			{
				var error = json.error;
				if( error != null )
				{
					this.__addMessage( error );
					return false;
				}
			}

			this.showAvailableShelves();
			return false;
		}.bind(this)
	});

	return false;

  },
  
  // hides the menu which shows the available shelves
  __clearAvailableShelves: function() {

	$$( 'div.epjs_shelves_shelf_select' ).each(function(el) { el.remove(); });

  },
	
  __boundRemoveFromShelf: function(event) {

	Event.stop(event);
	var data = $A(arguments);
	var shelfid = data[1];

	new Ajax.Request( '/cgi/shelves/remove?shelfid='+shelfid+'&eprintid='+this.eprint_id+'&t='+new Date().getTime(), {
		method: 'get',
		onSuccess: function(transport) {

			var json = this.__getJSON(transport);
			if( json != null )
			{
				var error = json.error;
				if( error != null )
				{
					this.__addMessage( error );
					return false;
				}
			}

			this.showAvailableShelves();
			return false;
		}.bind(this)
	});

	return false;
  },

  __buildShelfElement: function(shelf) {

	if( shelf.id == null )
		return null;

	var div = new Element( 'div', { 'class': 'epjs_shelves_shelf_select' } );
	var span = new Element( 'span' );
	div.appendChild( span );
	span.update( shelf.title );

	var ep_in_shelf = shelf.is_eprint;
	if( ep_in_shelf == '1' )
	{
		// add 'Remove' button
		var remove = new Element( 'a', { 'href': '#' } );
		div.appendChild( remove );
		remove.update( 'Remove' );
		Event.observe( remove, 'click', this.__boundRemoveFromShelf.bindAsEventListener(this, shelf.id) );
	}
	else
	{
		// add 'Add' button
		var add = new Element( 'a', { 'href': '#' } );
		div.appendChild( add );
		add.update( 'Add' );
		Event.observe( add, 'click', this.__boundAddToShelf.bindAsEventListener(this, shelf.id) );
	}

	return div;

  },
  
  // creates the HTML menus etc.
  __initContainers: function() {

/* DOM Structure

<div id="shelves_select">
	<img src="/style/images/tool_add_to_shelf_16.png" alt="Shelves Tool" border="0">
	<a id="shelves_link_select" href="#">Shelves</a>
</div>

<div style="display: none;" id="shelves_message"/>
<div style="display: none;" id="shelves_available">
	<a id="shelves_link_close_available" href="#">x</a>
</div>

*/

	var container = $( this.container_id );

        container.appendChild( Builder.node( 'div', {id:'shelves_select'}, [
                Builder.node( 'img', {src:'/style/images/tool_add_to_shelf_16.png',alt:'Shelves Tool',border:'0'} ),
                Builder.node( 'a', {id:'shelves_link_select', href:'#'} ) ] ) );

	container.appendChild( Builder.node( 'div', {id:'shelves_message'} ) );
	container.appendChild( Builder.node( 'div', {id:'shelves_available'}, [
		Builder.node( 'a', {id:'shelves_link_close_available',href:'#'} ) ] ) );


	[ 'shelves_available', 'shelves_message' ].each(function(name,idx) { $( name ).hide(); } );

	$( 'shelves_link_select' ).update( 'Shelves' );
	$( 'shelves_link_close_available' ).update( 'Close panel' );

	Event.observe( $( 'shelves_link_select' ), 'click', this.showAvailableShelves.bindAsEventListener(this) );
	Event.observe( $( 'shelves_link_close_available' ), 'click', function(event) { Event.stop(event); $( 'shelves_available' ).hide(); } );

	return;
  }

});





// Shelves handler for EPrints Searches
var EPJS_Shelves_Search = Class.create({

  // CLASS VARIABLES

  container_id: null,	// the main <div>
  selected_eprint_ids: null,	// currently selected items for that shelf
  selected_shelf_id: null,	// currently selected shelf by current_user

  locked_eprint_ids: null,	// will prevent too many actions/clicks on the same eprint

  eprints_cache_id: null,

  // PUBLIC FUNCTIONS

  // constructor
  initialize: function(params) {

	if( params == null )
		params = {};

	this.container_id = params.container_id;
	if( this.container_id == null )
		this.container_id = 'shelves';

	// don't show if we're not in a Search for EPrints (i.e. search for users, history...)
	if( !this.__isEPrintSearch() )
		return false;

	// attempts to get the EPrints Search cache_id
	this.__loadCacheId();

	this.selected_eprint_ids = new Hash();
	this.locked_eprint_ids = new Hash();

	// builds the HTML menus etc 
	this.__initContainers();

	// loads an already selected shelf (if any)
	this.__initShelf();

  },

  // called when the user selects a Shelf, optional store_selection will store a cookie via AJAX, to remember the user's currently selected shelf
  selectShelf: function( shelfid, store_selection ) {

	if( store_selection == null )
		store_selection = true;

	// this will load the eprintids contained in that shelf	
	this.loadShelf( shelfid );

	if( store_selection )
	{
		// store cookie
		new Ajax.Request( '/cgi/shelves/select?shelfid='+shelfid+'&t='+new Date().getTime(), {
			method: 'get'
		});
	}

	this.__hideSelectPanel();
	this.__clearAvailableShelves();

	return false;
  },
  
  // loads all the eprintids from a Shelf, adjusts action links etc
  // set 'use_effect' to true to use an Effect.appear()
  loadShelf: function(shelfid) {
			
	// clear currently selected eprints
	this.__clearEPrintIds();

	// Ajax to load the eprintids, then 'refresh' the search page
	new Ajax.Request( '/cgi/shelves/load?shelfid='+shelfid+'&t='+new Date().getTime(), {
		method: 'get',
		onSuccess: function(transport) {
		
			this.selected_shelf_id = shelfid;

			var json = this.__getJSON(transport);
        	        if( json != null )
                	{
				var error = json.error;
				if( error != null )
				{
					this.__addMessage( error );
					return false;
				}

				this.__hideMenu();
				var ids = json.shelf_ids;
				for( var i=0;i<ids.length;i++)
				{
					this.selected_eprint_ids.set( ids[i], '1' );
				}
				
				this.refreshActionLinks();
				this.__setSelectedShelfTitle( json.shelf_title );
				this.__showMenu();
			}
					
		}.bind(this)
	});
  },

  // the function that actually creates a new Shelf
  // the only param is the <input> element which holds the text for the Shelf's title
  createShelf: function(event) {

	Event.stop(event);
	var data = $A(arguments);
	var input = data[1];

	this.__clearMessages();

	
	if( input == null || input.value == null || input.value.length == 0 )
		return false;
	else
	{
		// sanitise 'input.value' ?
		new Ajax.Request( '/cgi/shelves/create?title='+input.value+'&t='+new Date().getTime(), {
			method: 'get',
			onSuccess: function(transport) {
	                
				var json = this.__getJSON(transport);
        		        if( json != null )
                		{
					var error = json.error;
					if( error != null )
						this.__addMessage( error );
					else
					{
						var id = json.id;
						if( id == null )
							this.__addMessage( document.createTextNode( 'Internal error' ) );
						else
						{
							input.value = "";
							this.__hideSelectPanel();
							this.selectShelf( id );
						}
					}
				}

			}.bind(this)
		});
	}

  },

  viewShelf: function(event) {

	Event.stop(event); 
	if( this.selected_shelf_id != null )
		document.location.href= eprints_http_cgiroot + '/users/home?screen=Shelf::View&shelfid='+this.selected_shelf_id;

	return false;
  },

  // loads available shelves to the current user
  showAvailableShelves: function(event) {

	Event.stop(event);

	new Ajax.Request( '/cgi/shelves/show_all?t='+new Date().getTime(), {
		method: 'get',
		onSuccess: function(transport) {

			this.__clearAll();
			var json = transport.responseText.evalJSON();
        	        if( json != null )
                	{

				this.__clearAvailableShelves();

				var error = json.error;
				if( error != null )
				{
					this.__addMessage( error );
				}
				else
				{
					var shelves = json.shelves;

					if( shelves == null || shelves.length == 0 )
					{
						this.__addMessage( '<div class="epjs_shelves_error">No Shelves found, maybe you need to create one.</div>' );
						this.__showSelectPanel();
						return false;
					}

					var contentEl = $( 'shelves_available' );
					for( var i=0; i<shelves.length; i++ )
					{
						var shelf_el = this.__buildShelfElement( shelves[i] );
						if( shelf_el != null )
							contentEl.appendChild( shelf_el );

					}
					this.__showSelectPanel();
				}
			}
		}.bind(this)	// end of onSuccess
	});

	return false;
  },

  // test if an EPrint is already in the current Shelf
  isEPrintInShelf: function(epid) {

	if( this.selected_eprint_ids.get(epid) == '1' )
		return true;

	return false;
  },

  // refreshes all action links (add/remove)
  refreshActionLinks:function() {

	this.__clearActionLinks();

	$$( 'shelfitem' ).each( function(item) {

		var epid = item.getAttribute( 'eprintid' );
	
		if( this.isEPrintInShelf(epid) )
			item.parentNode.appendChild( this.__createRemoveActionLink( epid ) );
		else
			item.parentNode.appendChild( this.__createAddActionLink( epid ) );

	}.bind(this));
	
  },

  // toggles the state of a given action link
  toggleItemActionButton: function(epid) {

	var el = $( 'shelf_link_'+epid );

	if( el == null )
		return false;

	var type = el.getAttribute( 'link_type' );
	if( type == null )
		return false;
		
	var parentEl = el.parentNode;

	if( type == 'add' )
	{
		el.remove();
		parentEl.appendChild( this.__createRemoveActionLink( epid ) );
	}
	else if( type == 'remove' )
	{
		el.remove();
		parentEl.appendChild( this.__createAddActionLink( epid ) );
	}

	return true;

  },

  // tests if an action is already been carried out on a given EPrint, to prevent multiple clicks crazyness
  isEPrintLocked: function(epid) {

	if( this.locked_eprint_ids.get(epid) == '1' )
		return true;

	return false;
  },

  // removes a given EPrint from the current Shelf
  removeFromShelf: function(event) {

	// the line below will properly 'return false' to the onclick event hence will not reload the page	
	Event.stop(event);
	var data = $A(arguments);
	var epid = data[1];

	if( this.isEPrintLocked(epid) )
		return false;

	this.__lockEPrint(epid);

	new Ajax.Request( '/cgi/shelves/remove?shelfid='+this.selected_shelf_id+'&eprintid='+epid+'&t='+new Date().getTime(), {
		method: 'get',
		onSuccess: function(transport) {

			var json = this.__getJSON(transport)
			if( json != null )
			{
				var error = json.error;
				if( error != null )
				{
					this.__addMessage( error );
					return false;
				}
			}

			this.selected_eprint_ids.unset( epid );
			this.toggleItemActionButton(epid);
			this.__unlockEPrint(epid);
			return false;
		}.bind(this)
	});

	return false;
  },

  // adds a given EPrint to the current Shelf
  addToShelf: function(event) {
	
	Event.stop(event);
	var data = $A(arguments);
	var epid = data[1];
	
	if( this.isEPrintLocked(epid) )
		return false;

	this.__lockEPrint(epid);

	new Ajax.Request( '/cgi/shelves/add?shelfid='+this.selected_shelf_id+'&eprintids='+epid+'&t='+new Date().getTime(), {
		method: 'get',
		onSuccess: function(transport) {

			var json = this.__getJSON(transport);
			if( json != null )
			{
				var error = json.error;
				if( error != null )
				{
					this.__addMessage( error );
					return false;
				}
			}

			this.selected_eprint_ids.set( epid, '1' );
			this.toggleItemActionButton(epid);
			this.__unlockEPrint(epid);
			return false;
		}.bind(this)
	});

	return false;

  },

  // empties the current Shelf, but asks politely to the user to confirm first
  emptyShelf: function(event) {

	Event.stop(event);

	if( confirm( 'Are you sure you want to empty the Shelf?' ) )
	{
		new Ajax.Request( '/cgi/shelves/empty?shelfid='+this.selected_shelf_id+'&t='+new Date().getTime(), {
			method: 'get',
			onSuccess: function(transport) {

				var json = this.__getJSON(transport);
				if( json != null )
				{
					var error = json.error;
					if( error != null )
					{
						this.__addMessage( error );
						return false;
					}
				}

				this.loadShelf(this.selected_shelf_id);
			}.bind(this)
		});
	}
  },

  // adds all search results on current page to the current Shelf
  addPageSearchResults: function(event) {

	Event.stop(event);

	var eprintids = null;

        var items = $$('shelfitem');

        items.each( function(item) {

                var epid = item.getAttribute( 'eprintid' );
		if( eprintids == null )
			eprintids = epid;
		else
			eprintids += ","+epid;

	}.bind(this) );

	if( eprintids != null )
	{
		new Ajax.Request( '/cgi/shelves/add?shelfid='+this.selected_shelf_id+'&eprintids='+eprintids+'&t='+new Date().getTime(), {
			method: 'get',
			onSuccess: function(transport) {

				var json = this.__getJSON(transport);
				if( json != null )
				{
					var error = json.error;
					if( error != null )
					{
						this.__addMessage( error );
						return false;
					}
				}

				this.loadShelf(this.selected_shelf_id);
			}.bind(this)
		});
	}

  },

  // adds all search results to the current Shelf (requires the EPrints cache_id param to be known)
  addAllSearchResults: function(event) {

	Event.stop(event);

//submit the export form


//first remove the _action_export_redir parameter, as it strips out unexpected params
	document.shelves_temp = $$('.ep_search_export form input[type=submit]')[0].remove();


	var action_url = $$('.ep_search_export form')[0].request({
		'method': 'get',
		'parameters': {
			'shelfid': this.selected_shelf_id,
			'output': 'AddToShelf',
			'_action_export': 'Export'
		},
		onSuccess: function(transport) {

			//reinsert the export button			
			$$('.ep_search_export form select')[0].insert({after:document.shelves_temp});

			var json = this.__getJSON(transport); 
			if( json != null )
			{
				var error = json.error;
				if( error != null )
				{
					this.__addMessage( error );
					return false;
				}
			}
			this.loadShelf(this.selected_shelf_id);

		}.bind(this)
	});
  },
 
  // INTERNAL FUNCTIONS

  __getJSON: function(transport) {

	if( transport == null )
		return null;

	if( transport.responseText == null || transport.responseText == '' )
		return null;

	return transport.responseText.evalJSON();
  },

  // loads an already selected Shelf (from ajax/cookie), used only when the EPJS Shelves object is created
  __initShelf: function() {
	
	new Ajax.Request( '/cgi/shelves/init?t='+new Date().getTime(), {
		method: 'get',
		onSuccess: function(transport) {

		var json = this.__getJSON(transport);
		if( json != null )
		{
		        var error = json.error;
			if( error != null )
			{
				this.__addMessage( error );
				return false;
			}

			var shelfid = json.shelfid;
			this.selectShelf(shelfid, false);
		}
		else
			this.__noShelf();

		}.bind(this)
	});
  },
  
  // internal function that properly stops the onclick event
  __boundSelectShelf: function(event) {

//	$( 'shelves_available' ).hide();

	Event.stop(event);
	var data = $A(arguments);
	var shelfid = data[1];
	
	return this.selectShelf(shelfid);
  },

  // sets the Shelf's title
  __setSelectedShelfTitle: function(title) {

	$( 'shelf_title' ).update( title );
  },

  __showMenu: function(use_effect) { 
	
	$( 'shelves_menu' ).show();  
  },

  __hideMenu: function() { $( 'shelves_menu' ).hide();  },

  __addMessage: function(el) {

	$( 'shelves_messages' ).update(el);
	$( 'shelves_messages' ).appear();
  },

  __clearMessages: function() {

	$( 'shelves_messages').hide();
	$( 'shelves_messages').update( '' );
  },

  __clearAll: function() {
	
	this.__clearMessages();
  },


/* DOM Structure:

<div id="shelves_content">
	<div id="shelves_status">
		<div id="shelves_img_container"><img src="/style/images/tool_add_to_shelf.png" alt="Shelves Tool" border="0"></div>
		<span id="shelf_title">No Shelf selected</span>
		<a id="shelves_link_change" href="#">[change]</a>
		<div style="display: none;" id="shelves_menu">
			<a id="shelf_link_view" href="#">View</a>
			<a id="shelf_link_add_all" href="#">Add all results</a>
			<a id="shelf_link_add_page" href="#">Add page results</a>
			<a id="shelf_link_empty" href="#">Empty</a>
		</div>
	</div>
	<div style="display: none;" id="shelves_messages" class="ep_msg_error_content"/>
	<div style="display: none;" id="shelves_select">
		<a id="shelves_link_close_select" href="#">Close</a>
		<div id="shelves_create">
			<span id="shelves_create_label">Shelf title:</span>
			<input id="shelves_create_input"/>
			<a id="shelves_create_action" href="#">Create</a>
		</div>
		<div id="shelves_available"/>
	</div>
</div>
*/

  // creates the HTML menus
  __initContainers: function() {

	var container = $( this.container_id );

	container.appendChild( Builder.node( 'div', {id:'shelves_content'}, 
	[
		Builder.node( 'div', {id:'shelves_status'}, 
		[
			Builder.node( 'div', {id:'shelves_img_container'} , 
			[
				Builder.node( 'img', {src:'/style/images/tool_add_to_shelf_16.png',alt:'Shelves Tool',border:'0'} )
			]),
			Builder.node( 'span', {id:'shelf_title'} ),
			Builder.node( 'a', {id:'shelves_link_change', href:'#'} ), 
			Builder.node( 'div', {id:'shelves_menu'}, 
			[
				Builder.node( 'a', {id:'shelf_link_add_all',href:'#'}),
				Builder.node( 'a', {id:'shelf_link_add_page',href:'#'}),
				Builder.node( 'a', {id:'shelf_link_empty',href:'#'} ), 
				Builder.node( 'a', {id:'shelf_link_view',href:'#'})
			]),
		] ),
		Builder.node( 'div', {id:'shelves_messages', 'class':'ep_msg_error_content'} ),
		Builder.node( 'div', {id:'shelves_select'}, 
		[
			Builder.node( 'a', {id:'shelves_link_close_select',href:'#'} ),
			Builder.node( 'div', {id:'shelves_create'}, [
				Builder.node( 'span', {id:'shelves_create_label'} ),
				Builder.node( 'input', {id:'shelves_create_input'} ),
				Builder.node( 'a', {id:'shelves_create_action', href:'#'} )
			] ),
			Builder.node( 'div', {id:'shelves_available'} ) 
		]),
	] ) );


	// init state
	[ 'shelves_messages', 'shelves_select', 'shelves_menu' ].each(function(name,idx) { $( name ).hide(); } );
	
	// nodes' content
	$( 'shelves_link_change' ).update( '[change]' );
	$( 'shelves_link_close_select' ).update( 'Close' );
	
	$( 'shelf_link_add_all' ).update( 'Add all results' );
	$( 'shelf_link_add_page' ).update( 'Add page results' );
	$( 'shelf_link_empty' ).update( 'Clear shelf' );
	$( 'shelf_link_view' ).update( 'View shelf' );

	$( 'shelves_create_label' ).update( 'Create new shelf:' );
	$( 'shelves_create_action' ).update( 'Create' );
	
	// Nodes event handlers
	
	Event.observe( $( 'shelves_link_change' ), 'click', this.showAvailableShelves.bindAsEventListener(this) );
	Event.observe( $( 'shelves_link_close_select' ), 'click', function(event) { Event.stop(event); $( 'shelves_select' ).hide(); } );
	Event.observe( $( 'shelf_link_view' ), 'click', this.viewShelf.bindAsEventListener(this) );
	Event.observe( $( 'shelf_link_empty' ), 'click', this.emptyShelf.bindAsEventListener(this) );
	Event.observe( $( 'shelf_link_add_page' ), 'click', this.addPageSearchResults.bindAsEventListener(this) );

	var create_input = $( 'shelves_create_input' );

	Event.observe( create_input, 'keypress', function(event) { if (event.keyCode == Event.KEY_RETURN) return this.createShelf(event,create_input); }.bindAsEventListener(this,create_input));
	Event.observe( $( 'shelves_create_action' ), 'click', this.createShelf.bindAsEventListener(this, create_input ) );

	// add all search results link
	if( this.eprints_cache_id != null )
	{
		Event.observe( $( 'shelf_link_add_all' ), 'click', this.addAllSearchResults.bindAsEventListener(this) );
	}

	return;
  },
  
  // build a Shelf 'Select' <div>, called after the user clicks on 'Select Shelf'
  __buildShelfElement: function(shelf) {

	if( shelf.id == null )
		return null;

	var div = new Element( 'div', { 'class': 'epjs_shelves_shelf_select' } );

	var select = new Element( 'a', { 'href': '#' } );
	div.appendChild( select );
	select.update( shelf.title );
	Event.observe( select, 'click', this.__boundSelectShelf.bindAsEventListener(this, shelf.id) );

	return div;
  },

  // parses the URI params (from http://www.netlobo.com/url_query_string_javascript.html), used to retrieve the search's cache_id
  __gup: function(name) {
	name = name.replace(/[\[]/,"\\\[").replace(/[\]]/,"\\\]");
	var regexS = "[\\?&]"+name+"=([^&#]*)";
	var regex = new RegExp( regexS );
	var results = regex.exec( window.location.href );
	if( results == null )
		return null;
	else
		return results[1];
  },

  // attempts to get the cache_id from the URI params or the EPrints::Screen's hidden element
  __loadCacheId: function() {

	this.eprints_cache_id = this.__gup( 'cache' );
	
	if( this.eprints_cache_id == null )
	{
		// Screen::Public::EPrintSearch prefers to set the cache_id as a hidden field
		var el = $( 'cache' );
		if( el != null )
			this.eprints_cache_id = el.value;
	}

  },

  // hides the menu which shows the available shelves
  __clearAvailableShelves: function() {
	$( 'shelves_available' ).update( '' );
  },

  // empties internal hashes, probably called to reset the current state upon (re-)loading a Shelf
  __clearEPrintIds: function() {

	// better way to empty a hash in JS?
	this.selected_eprint_ids = new Hash();
	this.locked_eprint_ids = new Hash();

  },
 
  // (un-)locking functions 
  __lockEPrint: function(epid) { this.locked_eprint_ids.set(epid, '1');  },

  __unlockEPrint: function(epid) { this.locked_eprint_ids.unset(epid);  },


  // action links functions
  __clearActionLinks: function() {

	$$('a.epjs_shelves_remove_button').each(function(el) { el.remove(); });
	$$('a.epjs_shelves_add_button').each(function(el) { el.remove(); });

  },
  
  __createRemoveActionLink: function(epid) {

	var remove_button = new Element( 'a', { 'href' : '#', 'class': 'epjs_shelves_remove_button', 'id': 'shelf_link_'+epid, 'link_type': 'remove' } );

	var img = new Element( 'img', { 'src': '/style/images/remove_from_shelf.png', 'alt': 'remove from shelf' } );
	remove_button.appendChild( img );

	Event.observe( remove_button, 'click', this.removeFromShelf.bindAsEventListener(this, epid) );

	return remove_button;
  },
  
  __createAddActionLink: function(epid) {
	
	var add_button = new Element( 'a', { 'href' : '#', 'class': 'epjs_shelves_add_button', 'id': 'shelf_link_'+epid, 'link_type': 'add' } );

	var img = new Element( 'img', { 'src': '/style/images/add_to_shelf.png', 'alt': 'add to shelf' } );
	add_button.appendChild( img );

	Event.observe( add_button, 'click', this.addToShelf.bindAsEventListener(this, epid) );

	return add_button;
  },

  __removeActionLink: function(epid) {

	var el = $( 'shelf_link_'+epid );
	if( el != null )
		el.remove();

  },

  __isEPrintSearch: function() {

	var el = $( 'screen' );
	if( el != null )
	{
		var value = el.value;

		if( value != null && ( value == 'Public::EPrintSearch' || value == 'Staff::EPrintSearch' ) )
			return true;

		if( value != null && value == 'Search' )
		{
			var dsel = $( 'dataset' );
			if( dsel != null )
			{
				var ds = dsel.value;
				if( ds != null && ( ds == 'inbox' || ds == 'buffer' || ds == 'archive' || ds == 'deletion' ) )
					return true;
			}
		}
	}

	return false;
  },

  __noShelf: function() {

	$( 'shelf_title' ).update( 'No shelf selected' ); 

  },

  __showSelectPanel: function() {

	$( 'shelves_select' ).appear();

  },

  __hideSelectPanel: function() {

	$( 'shelves_select' ).fade();

  }

// end of class definition 
});


